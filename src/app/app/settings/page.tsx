import { Card, Notice, PageHeader } from "@/components/ui";
import { requireOrg } from "@/lib/tenancy";
import { updateMyNotifications, updateOrganization } from "@/lib/actions/org";
import { TRADES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage(props: PageProps<"/app/settings">) {
  const sp = await props.searchParams;
  const ctx = await requireOrg("/app/settings");
  const canEdit = ctx.role !== "member";

  return (
    <>
      <PageHeader title="Company" subtitle="Used on reminders and invoices." />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}
      <div className="space-y-6">
        <Card title="Business details">
          <form action={updateOrganization} className="grid gap-4 sm:grid-cols-2">
            <fieldset disabled={!canEdit} className="contents">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="name">Business name</label>
                <input id="name" name="name" required defaultValue={ctx.org.name} className="input mt-1" />
              </div>
              <div>
                <label className="label" htmlFor="trade">Primary trade</label>
                <select id="trade" name="trade" defaultValue={ctx.org.trade ?? "General"} className="input mt-1">
                  {TRADES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone</label>
                <input id="phone" name="phone" defaultValue={ctx.org.phone ?? ""} className="input mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address">Business address</label>
                <input id="address" name="address" defaultValue={ctx.org.address ?? ""} className="input mt-1" placeholder="Street, City, IL ZIP" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="reminderEmail">Shared reminder inbox (optional)</label>
                <input id="reminderEmail" name="reminderEmail" type="email" defaultValue={ctx.org.reminderEmail ?? ""} className="input mt-1" placeholder="office@yourcompany.com" />
                <p className="mt-1 text-xs text-slate-500">Reminders also go to every teammate who has notifications on.</p>
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary" type="submit">Save</button>
                {!canEdit ? <span className="ml-3 text-xs text-slate-500">Only owners and admins can edit company details.</span> : null}
              </div>
            </fieldset>
          </form>
        </Card>

        <Card title="My notifications">
          <form action={updateMyNotifications} className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input type="checkbox" name="notifyEmail" defaultChecked={ctx.membership.notifyEmail} className="h-4 w-4 rounded border-slate-300" />
              Email me renewal reminders ({ctx.user.email})
            </label>
            <button className="btn-secondary" type="submit">Update</button>
          </form>
        </Card>
      </div>
    </>
  );
}
