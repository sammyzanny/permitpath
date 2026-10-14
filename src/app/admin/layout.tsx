import Link from "next/link";
import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/tenancy";
import { BRAND } from "@/lib/env";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePlatformAdmin();
  return (
    <>
      <header className="border-b border-amber-300 bg-amber-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-600 text-sm font-bold text-white">A</span>
              <span className="text-base font-semibold tracking-tight text-slate-900">{BRAND} admin</span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3 py-3 text-sm text-slate-700">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/app" className="btn-secondary py-1 text-xs">
              ← Back to app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
