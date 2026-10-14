import type { ReactNode } from "react";
import { SettingsNav } from "./nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
