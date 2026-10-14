import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getIdentity, signInPath } from "./auth";
import { env, isAdminEmail } from "./env";
import { effectiveLimits, type EffectiveLimits } from "./plans";
import type { Membership, Organization, User } from "@/db/schema";

const { users, organizations, memberships } = schema;

export const ORG_COOKIE = "pp_org";

export type Role = "owner" | "admin" | "member";

export interface OrgContext {
  user: User;
  org: Organization;
  membership: Membership;
  role: Role;
  limits: EffectiveLimits;
  isPlatformAdmin: boolean;
}

/** Upsert the signed-in identity into `users`. Null when nobody is signed in.
 *  Wrapped in React cache() so layout + page share one lookup per request, and the
 *  insert is an upsert so concurrent first-time requests can't race. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const identity = await getIdentity();
  if (!identity) return null;
  const db = await getDb();

  // First sign-in from a new auth identity (e.g. after moving from the Clerk dev
  // instance to production, or from dev-login to Clerk): if a user with this
  // verified email already exists, re-link that row instead of creating a second
  // person who would lose their org memberships.
  const [byAuth] = await db.select({ id: users.id }).from(users).where(eq(users.authId, identity.authId)).limit(1);
  if (!byAuth) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, identity.email)).orderBy(asc(users.id)).limit(1);
    if (byEmail) {
      const [relinked] = await db
        .update(users)
        .set({ authId: identity.authId, lastSeenAt: new Date(), ...(identity.name ? { name: identity.name } : {}) })
        .where(eq(users.id, byEmail.id))
        .returning();
      return relinked;
    }
  }

  const [row] = await db
    .insert(users)
    .values({ authId: identity.authId, email: identity.email, name: identity.name, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: users.authId,
      set: { email: identity.email, lastSeenAt: new Date(), ...(identity.name ? { name: identity.name } : {}) },
    })
    .returning();
  return row;
});

export async function requireUser(returnTo = "/app"): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect(signInPath(returnTo));
  return u;
}

export async function listUserOrgs(userId: number) {
  const db = await getDb();
  return db
    .select({ org: organizations, membership: memberships })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(organizations.name));
}

/**
 * The active organization for this user: the one in the `pp_org` cookie if they
 * belong to it, otherwise their first membership. Null if they have none yet.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await listUserOrgs(user.id);
  if (rows.length === 0) return null;
  const jar = await cookies();
  const wanted = Number(jar.get(ORG_COOKIE)?.value);
  const pick = rows.find((r) => r.org.id === wanted) ?? rows[0];
  return {
    user,
    org: pick.org,
    membership: pick.membership,
    role: pick.membership.role as Role,
    limits: effectiveLimits(pick.org),
    isPlatformAdmin: isAdminEmail(user.email),
  };
});

/** For /app pages: signed in AND has an org, else route them to the right place. */
export async function requireOrg(returnTo = "/app"): Promise<OrgContext> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath(returnTo));
  const ctx = await getOrgContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

export function requireRole(ctx: OrgContext, roles: Role[]) {
  if (!roles.includes(ctx.role)) throw new Error("You don't have permission to do that.");
}

/** For /admin: platform admin by email allow-list. */
export async function requirePlatformAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (!isAdminEmail(user.email)) redirect("/app?denied=admin");
  return user;
}

export async function getMembership(orgId: number, userId: number) {
  const db = await getDb();
  const [m] = await db.select().from(memberships).where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId))).limit(1);
  return m ?? null;
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

export const isDevAuth = !env.clerk.configured;
