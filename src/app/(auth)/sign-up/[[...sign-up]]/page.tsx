import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { PublicShell } from "@/components/public-shell";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (!env.clerk.configured) redirect("/dev-login?redirect_url=%2Fonboarding");
  return (
    <PublicShell>
      <div className="flex justify-center py-6">
        <SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
      </div>
    </PublicShell>
  );
}
