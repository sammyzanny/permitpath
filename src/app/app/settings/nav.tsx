"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app/settings", label: "Company", exact: true },
  { href: "/app/settings/team", label: "Team" },
  { href: "/app/settings/billing", label: "Plan & billing" },
  { href: "/app/settings/activity", label: "Activity log" },
];

export function SettingsNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
