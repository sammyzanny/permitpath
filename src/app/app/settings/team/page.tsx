import Link from "next/link";
import { Card, Notice, PageHeader, Pill } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { listMembers, listPendingInvitations } from "@/lib/queries";
import { changeMemberRole, inviteMember, removeMember, revokeInvitation } from "@/lib/actions/org";
import { formatDate } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export default async function TeamPage(props: PageProps<"/app/settings/team">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/settings/team");
  const [members, pending] = await Promise.all([listMembers(ctx.org.id), listPendingInvitations(ctx.org.id)]);
  const canManage = ctx.role !== "member";
  const limit = ctx.limits.maxUsers;
  const atLimit = limit !== null && members.length >= limit;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={
          <>
            Everyone who can see and update {ctx.org.name}&apos;s registrations.
            {limit !== null ? (
              <>
                {" "}
                {members.length} of {limit} seats used on the {ctx.limits.label} plan.
              </>
            ) : null}
          </>
        }
      />
      {sp.invited ? <Notice>Invitation sent.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}

      <div className="space-y-6">
        <Card title="Members">
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.membership.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium text-slate-900">
                    {m.user.name ?? m.user.email}
                    {m.user.id === ctx.user.id ? <span className="ml-2 text-xs text-slate-500">(you)</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.user.email} · joined {formatDate(m.membership.createdAt.toISOString().slice(0, 10))} · {m.membership.notifyEmail ? "gets reminders" : "reminders off"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ctx.role === "owner" && m.user.id !== ctx.user.id ? (
                    <form action={changeMemberRole} className="flex items-center gap-1">
                      <input type="hidden" name="membershipId" value={m.membership.id} />
                      <select name="role" defaultValue={m.membership.role} className="input py-1 text-xs">
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button className="btn-secondary py-1 text-xs" type="submit">
                        Set
                      </button>
                    </form>
                  ) : (
                    <Pill tone={m.membership.role === "owner" ? "blue" : "slate"}>{m.membership.role}</Pill>
                  )}
                  {canManage && m.user.id !== ctx.user.id && m.membership.role !== "owner" ? (
                    <form action={removeMember.bind(null, m.membership.id)}>
                      <button className="text-xs text-red-700 hover:underline" type="submit">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {pending.length > 0 ? (
          <Card title="Pending invitations">
            <ul className="divide-y divide-slate-100">
              {pending.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {i.email} <Pill>{i.role}</Pill> <span className="text-xs text-slate-500">expires {formatDate(i.expiresAt.toISOString().slice(0, 10))}</span>
                  </span>
                  {canManage ? (
                    <form action={revokeInvitation.bind(null, i.id)}>
                      <button className="text-xs text-red-700 hover:underline" type="submit">
                        Revoke
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {canManage ? (
          <Card title="Invite a teammate">
            {atLimit ? (
              <Notice tone="amber">
                Your plan is at its seat limit.{" "}
                <Link href="/app/settings/billing" className="underline">
                  Upgrade
                </Link>{" "}
                to add more people.
              </Notice>
            ) : null}
            <form action={inviteMember} className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input id="email" name="email" type="email" required className="input mt-1" placeholder="office@yourcompany.com" disabled={atLimit || ctx.limits.readOnly} />
              </div>
              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <select id="role" name="role" className="input mt-1" defaultValue="member" disabled={atLimit || ctx.limits.readOnly}>
                  <option value="member">Member — view & update registrations</option>
                  <option value="admin">Admin — also manage team & billing</option>
                </select>
              </div>
              <button className="btn-primary" type="submit" disabled={atLimit || ctx.limits.readOnly}>
                Send invite
              </button>
            </form>
          </Card>
        ) : null}
      </div>
    </>
  );
}
