import Link from "next/link";
import type { ReactNode } from "react";
import type { RegistrationHealth } from "@/lib/expiry";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const tones = {
    default: "text-slate-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
  };
  return (
    <div className="card px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

const healthStyles: Record<RegistrationHealth, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  expiring: { label: "Expiring soon", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-700 ring-red-200" },
  unknown: { label: "No expiry set", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
  not_registered: { label: "Not registered", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function HealthBadge({ health, daysLeft }: { health: RegistrationHealth; daysLeft?: number | null }) {
  const s = healthStyles[health];
  let suffix = "";
  if (daysLeft !== null && daysLeft !== undefined && (health === "expiring" || health === "active")) suffix = ` · ${daysLeft}d`;
  if (health === "expired" && daysLeft !== null && daysLeft !== undefined) suffix = ` · ${Math.abs(daysLeft)}d ago`;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>{s.label + suffix}</span>;
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-800",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function ConfidencePill({ level }: { level: string }) {
  const tone = level === "high" ? "green" : level === "medium" ? "amber" : "red";
  const label = level === "high" ? "Verified from official source" : level === "medium" ? "Partially verified — confirm by phone" : "Unverified";
  return <Pill tone={tone}>{label}</Pill>;
}

/** Renders "not published" values in muted style so gaps are obvious. */
export function Fact({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  const isGap = typeof value === "string" && (/^not published/i.test(value) || /^unknown/i.test(value) || value === "" || value === "—");
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="label">{label}</dt>
      <dd className={`mt-1 text-sm ${isGap ? "italic text-slate-400" : "text-slate-800"}`}>{value || "—"}</dd>
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      <p>{children}</p>
      {action ? (
        <Link href={action.href} className="btn-primary mt-4">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function Notice({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" }) {
  const cls = { green: "border-emerald-200 bg-emerald-50 text-emerald-800", amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-800" }[tone];
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
