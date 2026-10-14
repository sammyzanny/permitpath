import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="py-20 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-600">That town or page doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary mt-6">Back home</Link>
      </div>
    </PublicShell>
  );
}
