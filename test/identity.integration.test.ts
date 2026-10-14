import { describe, it, expect, vi } from "vitest";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

// getCurrentUser reads the signed-in identity from request headers/cookies; stub
// that layer so we can exercise the user-row logic against the in-memory database.
let identity: { authId: string; email: string; name: string | null } | null = null;
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ getIdentity: async () => identity, signInPath: (r: string) => `/sign-in?returnTo=${r}` }));

const { getCurrentUser } = await import("@/lib/tenancy");

describe("getCurrentUser", () => {
  it("creates a user on first sign-in and reuses it afterwards", async () => {
    identity = { authId: "user_clerk_dev_1", email: "owner@example.com", name: "Owner" };
    const a = await getCurrentUser();
    const b = await getCurrentUser();
    expect(a?.id).toBe(b?.id);
    expect(a?.email).toBe("owner@example.com");
  });

  it("re-links an existing user (and their memberships) when the auth id changes but the email matches", async () => {
    const db = await getDb();
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, "owner@example.com"));
    const [org] = await db.insert(schema.organizations).values({ slug: "relink-org", name: "Relink Org", plan: "trial", planStatus: "trialing", createdByUserId: existing.id }).returning();
    await db.insert(schema.memberships).values({ orgId: org.id, userId: existing.id, role: "owner" });

    // Same person signs in through the production Clerk instance → new Clerk id.
    identity = { authId: "user_clerk_prod_1", email: "owner@example.com", name: "Owner" };
    const relinked = await getCurrentUser();
    expect(relinked?.id).toBe(existing.id);
    expect(relinked?.authId).toBe("user_clerk_prod_1");

    const members = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, existing.id));
    expect(members.map((m) => m.orgId)).toContain(org.id);
    const all = await db.select().from(schema.users).where(eq(schema.users.email, "owner@example.com"));
    expect(all).toHaveLength(1);
  });

  it("does not touch other people's rows", async () => {
    identity = { authId: "user_clerk_prod_2", email: "someone-else@example.com", name: null };
    const u = await getCurrentUser();
    expect(u?.authId).toBe("user_clerk_prod_2");
    const owner = await getDb().then((db) => db.select().from(schema.users).where(eq(schema.users.email, "owner@example.com")));
    expect(owner[0].authId).toBe("user_clerk_prod_1");
  });
});
