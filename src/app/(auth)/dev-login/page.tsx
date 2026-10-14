import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { Card, Notice } from "@/components/ui";
import { env, BRAND } from "@/lib/env";
import { devSignIn } from "@/lib/actions/dev-auth";

export const dynamic = "force-dynamic";

export default async function DevLogin(props: PageProps<"/dev-login">) {
  if (env.clerk.configured) redirect("/sign-in");
  if (!env.allowDevAuth) redirect("/");
  const sp = await props.searchParams;
  const redirectUrl = typeof sp.redirect_url === "string" ? sp.redirect_url : "/app";
  return (
    <PublicShell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mb-6 text-sm text-slate-600">
          <strong>Development mode.</strong> Clerk isn&apos;t configured, so {BRAND} uses a local cookie session. Enter any email — an account is created on the fly. Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code className="rounded bg-slate-100 px-1">CLERK_SECRET_KEY</code> to switch to real login.
        </p>
        {typeof sp.error === "string" ? <Notice tone="red">{sp.error}</Notice> : null}
        <Card>
          <form action={devSignIn} className="space-y-4">
            <input type="hidden" name="redirect_url" value={redirectUrl} />
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" required className="input mt-1" placeholder="you@example.com" defaultValue="demo@permitpath.app" />
            </div>
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" className="input mt-1" placeholder="Your name" />
            </div>
            <button className="btn-primary w-full justify-center" type="submit">
              Continue
            </button>
          </form>
        </Card>
        <p className="mt-4 text-xs text-slate-500">
          Demo account: <code>demo@permitpath.app</code> (created by <code>npm run seed:demo</code>). Admin access: add your email to <code>ADMIN_EMAILS</code>.
        </p>
      </div>
    </PublicShell>
  );
}
