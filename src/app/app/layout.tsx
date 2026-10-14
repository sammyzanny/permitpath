import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireOrg } from "@/lib/tenancy";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireOrg();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}
