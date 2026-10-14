"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/jurisdictions", label: "Jurisdictions" },
  { href: "/admin/reports", label: "Rule reports" },
  { href: "/admin/orgs", label: "Customers" },
  { href: "/admin/outbox", label: "Email outbox" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-amber-100"}`}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
