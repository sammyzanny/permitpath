import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { PublicShell } from "@/components/public-shell";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SignInPage(props: PageProps<"/sign-in/[[...sign-in]]">) {
  const sp = await props.searchParams;
  if (!env.clerk.configured) {
    const r = typeof sp.redirect_url === "string" ? `?redirect_url=${encodeURIComponent(sp.redirect_url)}` : "";
    redirect(`/dev-login${r}`);
  }
  return (
    <PublicShell>
      <div className="flex justify-center py-6">
        <SignIn forceRedirectUrl="/app" signUpUrl="/sign-up" />
      </div>
    </PublicShell>
  );
}
