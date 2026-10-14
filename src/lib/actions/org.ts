"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { ORG_COOKIE, getOrgContext, listUserOrgs, requireOrg, requireRole, requireUser, slugify } from "../tenancy";
import { env } from "../env";
import { inviteMail, sendMail, welcomeMail } from "../email";
import { audit } from "../audit";
import { formError, optText, reqText, str, withError, withOk } from "../forms";
import { countMembers } from "../queries";
import { computeExpiry } from "../expiry";
import { ruleOf, jurisdictionsByIds } from "../queries";

const { organizations, memberships, invitations, registrations } = schema;

// ---------------------------------------------------------------------------
// Onboarding: create the org, pick towns
// ---------------------------------------------------------------------------

const OnboardingInput = z.object({
  name: reqText("Business name", 120),
  trade: optText,
  phone: optText,
  townIds: z.array(z.number().int().positive()).max(200),
});

export async function createOrganization(formData: FormData) {
  const user = await requireUser("/onboarding");
  let orgId: number;
  try {
    const parsed = OnboardingInput.parse({
      name: str(formData, "name"),
      trade: str(formData, "trade"),
      phone: str(formData, "phone"),
      townIds: formData.getAll("townIds").map((v) => Number(v)),
    });
    const db = await getDb();
    let slug = slugify(parsed.name);
    const clash = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (clash[0]) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    const [org] = await db
      .insert(organizations)
      .values({
        slug,
        name: parsed.name,
        trade: parsed.trade,
        phone: parsed.phone,
        plan: "trial",
        planStatus: "trialing",
        trialEndsAt: new Date(Date.now() + env.trialDays * 86_400_000),
        createdByUserId: user.id,
      })
      .returning();
    orgId = org.id;
    await db.insert(memberships).values({ orgId: org.id, userId: user.id, role: "owner" });

    if (parsed.townIds.length) {
      const towns = await jurisdictionsByIds(parsed.townIds);
      await db.insert(registrations).values(towns.map((j) => ({ orgId: org.id, jurisdictionId: j.id, status: "planned" }))).onConflictDoNothing();
    }

    await audit({ orgId: org.id, userId: user.id, action: "org.create", meta: { towns: parsed.townIds.length } });
    await sendMail(welcomeMail({ to: user.email, name: user.name, orgName: org.name, trialDays: env.trialDays }));
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/onboarding", formError(err)));
  }
  const jar = await cookies();
  jar.set(ORG_COOKIE, String(orgId), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app?welcome=1");
}

export async function switchOrganization(formData: FormData) {
  const user = await requireUser();
  const orgId = Number(str(formData, "orgId"));
  const mine = await listUserOrgs(user.id);
  if (!mine.some((r) => r.org.id === orgId)) throw new Error("Not a member of that organization");
  const jar = await cookies();
  jar.set(ORG_COOKIE, String(orgId), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const OrgSettingsInput = z.object({
  name: reqText("Business name", 120),
  trade: optText,
  phone: optText,
  address: optText,
  reminderEmail: z.union([z.literal(""), z.string().trim().email("Reminder email is not a valid address")]).transform((s) => (s === "" ? null : s.toLowerCase())),
});

export async function updateOrganization(formData: FormData) {
  const ctx = await requireOrg("/app/settings");
  try {
    requireRole(ctx, ["owner", "admin"]);
    const parsed = OrgSettingsInput.parse({
      name: str(formData, "name"),
      trade: str(formData, "trade"),
      phone: str(formData, "phone"),
      address: str(formData, "address"),
      reminderEmail: str(formData, "reminderEmail"),
    });
    const db = await getDb();
    await db.update(organizations).set(parsed).where(eq(organizations.id, ctx.org.id));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "org.update" });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/settings", formError(err)));
  }
  revalidatePath("/app", "layout");
  redirect(withOk("/app/settings"));
}

export async function updateMyNotifications(formData: FormData) {
  const ctx = await requireOrg("/app/settings");
  const db = await getDb();
  await db
    .update(memberships)
    .set({ notifyEmail: str(formData, "notifyEmail") === "on" })
    .where(eq(memberships.id, ctx.membership.id));
  revalidatePath("/app/settings");
  redirect(withOk("/app/settings"));
}

// ---------------------------------------------------------------------------
// Team & invitations
// ---------------------------------------------------------------------------

const InviteInput = z.object({ email: z.string().trim().email("Enter a valid email").transform((s) => s.toLowerCase()), role: z.enum(["admin", "member"]) });

export async function inviteMember(formData: FormData) {
  const ctx = await requireOrg("/app/settings/team");
  try {
    requireRole(ctx, ["owner", "admin"]);
    const parsed = InviteInput.parse({ email: str(formData, "email"), role: str(formData, "role") || "member" });
    const members = await countMembers(ctx.org.id);
    if (ctx.limits.maxUsers !== null && members >= ctx.limits.maxUsers) {
      throw new Error(`Your ${ctx.limits.label} plan allows ${ctx.limits.maxUsers} user${ctx.limits.maxUsers === 1 ? "" : "s"}. Upgrade to invite more.`);
    }
    if (ctx.limits.readOnly) throw new Error("Your subscription is inactive. Choose a plan to invite teammates.");
    const db = await getDb();
    const token = randomBytes(24).toString("base64url");
    await db.insert(invitations).values({ orgId: ctx.org.id, email: parsed.email, role: parsed.role, token, invitedByUserId: ctx.user.id, expiresAt: new Date(Date.now() + 7 * 86_400_000) });
    await sendMail(inviteMail({ to: parsed.email, orgName: ctx.org.name, inviterName: ctx.user.name ?? ctx.user.email, token, role: parsed.role }));
    await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "team.invite", meta: { email: parsed.email, role: parsed.role } });
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/settings/team", formError(err)));
  }
  revalidatePath("/app/settings/team");
  redirect(withOk("/app/settings/team", "invited"));
}

export async function revokeInvitation(id: number) {
  const ctx = await requireOrg("/app/settings/team");
  requireRole(ctx, ["owner", "admin"]);
  const db = await getDb();
  await db.delete(invitations).where(and(eq(invitations.id, id), eq(invitations.orgId, ctx.org.id)));
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "team.invite_revoked", targetId: id });
  revalidatePath("/app/settings/team");
  redirect("/app/settings/team");
}

export async function acceptInvitation(token: string) {
  const user = await requireUser(`/invite/${token}`);
  const db = await getDb();
  const [inv] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
  if (!inv || inv.acceptedAt || inv.expiresAt.getTime() < Date.now()) redirect("/invite/invalid");
  if (inv.email !== user.email) redirect(`/invite/${token}?mismatch=1`);
  await db.insert(memberships).values({ orgId: inv.orgId, userId: user.id, role: inv.role }).onConflictDoNothing();
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));
  await audit({ orgId: inv.orgId, userId: user.id, action: "team.joined", meta: { role: inv.role } });
  const jar = await cookies();
  jar.set(ORG_COOKIE, String(inv.orgId), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  redirect("/app?joined=1");
}

export async function changeMemberRole(formData: FormData) {
  const ctx = await requireOrg("/app/settings/team");
  requireRole(ctx, ["owner"]);
  const membershipId = Number(str(formData, "membershipId"));
  const role = str(formData, "role");
  if (!["owner", "admin", "member"].includes(role)) throw new Error("Bad role");
  const db = await getDb();
  await db.update(memberships).set({ role }).where(and(eq(memberships.id, membershipId), eq(memberships.orgId, ctx.org.id)));
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "team.role_changed", targetId: membershipId, meta: { role } });
  revalidatePath("/app/settings/team");
  redirect("/app/settings/team");
}

export async function removeMember(membershipId: number) {
  const ctx = await requireOrg("/app/settings/team");
  requireRole(ctx, ["owner", "admin"]);
  if (membershipId === ctx.membership.id) throw new Error("You can't remove yourself. Transfer ownership first.");
  const db = await getDb();
  await db.delete(memberships).where(and(eq(memberships.id, membershipId), eq(memberships.orgId, ctx.org.id)));
  await audit({ orgId: ctx.org.id, userId: ctx.user.id, action: "team.removed", targetId: membershipId });
  revalidatePath("/app/settings/team");
  redirect("/app/settings/team");
}

// Used by onboarding preview: given town ids and an issue date, show computed expiry (server-side helper)
export async function previewExpiry(jurisdictionId: number, issuedOn: string) {
  const ctx = await getOrgContext();
  if (!ctx) return null;
  const [j] = await jurisdictionsByIds([jurisdictionId]);
  return j ? computeExpiry(ruleOf(j), issuedOn) : null;
}
