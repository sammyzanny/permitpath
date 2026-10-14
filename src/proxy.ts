import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection. Next 16 renamed middleware.ts → proxy.ts.
 *
 * With Clerk configured, clerkMiddleware protects /app and /admin. Without it,
 * we check the dev-session cookie ourselves and bounce to /dev-login.
 * Cron and webhook routes are always public (they authenticate with secrets).
 */
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const allowDevAuth = process.env.ALLOW_DEV_AUTH === "1" || process.env.NODE_ENV !== "production";

const PROTECTED = [/^\/app(\/.*)?$/, /^\/admin(\/.*)?$/, /^\/onboarding$/, /^\/invite\/(?!invalid)(.*)$/];

function isProtected(pathname: string) {
  return PROTECTED.some((re) => re.test(pathname));
}

async function devProxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();
  if (!allowDevAuth) return NextResponse.redirect(new URL("/sign-in", req.url));
  const hasSession = Boolean(req.cookies.get("pp_dev_session")?.value);
  if (hasSession) return NextResponse.next();
  const url = new URL("/dev-login", req.url);
  url.searchParams.set("redirect_url", pathname + search);
  return NextResponse.redirect(url);
}

let clerkHandler: ((req: NextRequest, ev: unknown) => Promise<Response> | Response) | null = null;

async function clerkProxy(req: NextRequest, ev: unknown) {
  if (!clerkHandler) {
    const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
    const isProtectedRoute = createRouteMatcher(["/app(.*)", "/admin(.*)", "/onboarding", "/invite/:token"]);
    clerkHandler = clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) await auth.protect();
    }) as unknown as typeof clerkHandler;
  }
  return clerkHandler!(req, ev);
}

export default async function proxy(req: NextRequest, ev: unknown) {
  return clerkConfigured ? clerkProxy(req, ev) : devProxy(req);
}

export const config = {
  matcher: [
    // Skip Next internals and static files; include API routes so Clerk can read auth there too.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
