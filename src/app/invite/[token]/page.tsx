import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { PublicShell } from "@/components/public-shell";
import { Card, Notice } from "@/components/ui";
import { requireUser } from "@/lib/tenancy";
import { acceptInvitation } from "@/lib/actions/org";
import { signOut } from "@/lib/actions/dev-auth";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const user = await requireUser(`/invite/${token}`);
  const db = await getDb();
  const now = new Date();
  const [inv] = await db
    .select({ inv: schema.invitations, org: schema.organizations })
    .from(schema.invitations)
    .innerJoin(schema.organizations, eq(schema.invitations.orgId, schema.organizations.id))
    .where(eq(schema.invitations.token, token))
    .limit(1);
  const valid = inv && !inv.inv.acceptedAt && inv.inv.expiresAt.getTime() > now.getTime();
  const accept = acceptInvitation.bind(null, token);

  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Team invitation</h1>
        {!valid ? (
          <Notice tone="red">This invitation is invalid, expired, or already used. Ask the person who invited you to send a new one.</Notice>
        ) : inv.inv.email !== user.email ? (
          <Card>
            <p className="text-sm text-slate-700">
              This invitation was sent to <strong>{inv.inv.email}</strong>, but you&apos;re signed in as <strong>{user.email}</strong>.
            </p>
            {env.clerk.configured ? (
              <p className="mt-3 text-sm text-slate-600">Sign out and sign in with the invited address.</p>
            ) : (
              <form action={signOut} className="mt-4">
                <button className="btn-secondary" type="submit">
                  Sign out and switch account
                </button>
              </form>
            )}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-700">
              You&apos;ve been invited to join <strong>{inv.org.name}</strong> as a <strong>{inv.inv.role}</strong>.
            </p>
            <form action={accept} className="mt-4">
              <button className="btn-primary w-full justify-center" type="submit">
                Accept and open {inv.org.name}
              </button>
            </form>
            {sp.mismatch ? <p className="mt-3 text-xs text-red-700">Email mismatch — please sign in with the invited address.</p> : null}
          </Card>
        )}
        <p className="mt-4 text-xs text-slate-500">
          <Link href="/app" className="underline">
            Back to the app
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
