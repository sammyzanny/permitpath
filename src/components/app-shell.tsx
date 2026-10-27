import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppNav } from "./app-nav";
import { BRAND, env } from "@/lib/env";
import { trialDaysLeft } from "@/lib/plans";
import type { OrgContext } from "@/lib/tenancy";
import { signOut } from "@/lib/actions/dev-auth";
import { switchOrganization } from "@/lib/actions/org";
import { listUserOrgs } from "@/lib/tenancy";
import { UserButton } from "@clerk/nextjs";

export async function AppShell({ ctx, children }: { ctx: OrgContext; children: ReactNode }) {
  const orgs = await listUserOrgs(ctx.user.id);
  const daysLeft = ctx.org.plan === "trial" ? trialDaysLeft(ctx.org.trialEndsAt) : null;

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/app" className="flex items-center gap-2 py-3">
              <Image src="/brand/icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" priority />
              <span className="text-base font-semibold tracking-tight text-slate-900">{BRAND}</span>
            </Link>
            <AppNav isAdmin={ctx.isPlatformAdmin} />
          </div>
          <div className="flex items-center gap-3 py-3 text-sm">
            {orgs.length > 1 ? (
              <form action={switchOrganization}>
                <select name="orgId" defaultValue={ctx.org.id} className="input py-1 text-xs">
                  {orgs.map((o) => (
                    <option key={o.org.id} value={o.org.id}>
                      {o.org.name}
                    </option>
                  ))}
                </select>
                <button className="ml-1 text-xs text-slate-500 hover:underline" type="submit">
                  switch
                </button>
              </form>
            ) : (
              <span className="hidden truncate text-slate-600 sm:inline">{ctx.org.name}</span>
            )}
            {env.clerk.configured ? (
              <UserButton />
            ) : (
              <form action={signOut}>
                <button className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" type="submit" title={ctx.user.email}>
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
        <AppNav isAdmin={ctx.isPlatformAdmin} mobile />
      </header>

      {ctx.limits.readOnly ? (
        <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
          {ctx.org.plan === "trial" ? "Your free trial has ended." : "Your subscription is inactive."} Your data is safe but read-only.{" "}
          <Link href="/app/settings/billing" className="font-semibold underline">
            Choose a plan
          </Link>
        </div>
      ) : daysLeft !== null && daysLeft <= 7 ? (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          {daysLeft <= 0 ? "Your trial ends today." : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}{" "}
          <Link href="/app/settings/billing" className="font-semibold underline">
            Pick a plan
          </Link>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Rules compiled from municipal websites, forms and ordinances and re-verified on a schedule. Fees and dates change — confirm with the village before submitting.{" "}
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy
        </Link>
      </footer>
    </>
  );
}
