import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/env";
import { getCurrentUser } from "@/lib/tenancy";
import { signInPath } from "@/lib/auth";

export async function PublicShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const user = await getCurrentUser().catch(() => null);
  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">{BRAND[0]}</span>
            <span className="text-base font-semibold tracking-tight text-slate-900">{BRAND}</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/rules" className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Town rules
            </Link>
            <Link href="/pricing" className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Pricing
            </Link>
            {user ? (
              <Link href="/app" className="btn-primary ml-2">
                Open app
              </Link>
            ) : (
              <>
                <Link href={signInPath()} className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn-primary ml-2">
                  Start free trial
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6">
          <span>
            © {new Date().getFullYear()} {BRAND}. Rules compiled from municipal sources; always confirm with the village.
          </span>
          <span className="flex gap-4">
            <Link href="/rules" className="hover:underline">
              Town rules
            </Link>
            <Link href="/pricing" className="hover:underline">
              Pricing
            </Link>
            <Link href="/legal/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:underline">
              Privacy
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}
