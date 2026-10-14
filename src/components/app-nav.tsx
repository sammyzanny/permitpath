"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/towns", label: "My towns" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/documents", label: "Documents" },
  { href: "/app/rules", label: "Rules" },
  { href: "/app/settings", label: "Settings" },
];

export function AppNav({ isAdmin, mobile = false }: { isAdmin: boolean; mobile?: boolean }) {
  const path = usePathname();
  const all = isAdmin ? [...items, { href: "/admin", label: "Admin" }] : items;
  const isActive = (it: { href: string; exact?: boolean }) => (it.exact ? path === it.href : path.startsWith(it.href));
  if (mobile) {
    return (
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {all.map((it) => (
          <Link key={it.href} href={it.href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${isActive(it) ? "bg-slate-900 text-white" : "text-slate-600"}`}>
            {it.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {all.map((it) => (
        <Link key={it.href} href={it.href} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${isActive(it) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
