import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Notice } from "@/components/ui";

export default function InvalidInvite() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <Notice tone="red">This invitation is invalid, expired, or already used.</Notice>
        <Link href="/app" className="btn-secondary">Back to the app</Link>
      </div>
    </PublicShell>
  );
}
