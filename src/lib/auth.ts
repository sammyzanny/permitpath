import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** Who is signed in, independent of provider. */
export interface Identity {
  authId: string; // Clerk user id, or "dev:<email>"
  email: string;
  name: string | null;
  imageUrl?: string | null;
}

export const DEV_COOKIE = "pp_dev_session";
const DEV_SECRET = process.env.DEV_AUTH_SECRET ?? "permitpath-dev-secret-change-me";

function sign(payload: string) {
  return createHmac("sha256", DEV_SECRET).update(payload).digest("base64url");
}

export function encodeDevSession(identity: { email: string; name: string | null }) {
  const payload = Buffer.from(JSON.stringify(identity)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeDevSession(value: string | undefined): Identity | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { email, name } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; name: string | null };
    if (!email) return null;
    return { authId: `dev:${email.toLowerCase()}`, email: email.toLowerCase(), name: name ?? null };
  } catch {
    return null;
  }
}

/** Resolve the signed-in identity from Clerk, or from the dev cookie when Clerk isn't configured. */
export async function getIdentity(): Promise<Identity | null> {
  if (env.clerk.configured) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const u = await currentUser();
    const email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress;
    if (!email) return null;
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(" ") || null;
    return { authId: userId, email: email.toLowerCase(), name, imageUrl: u?.imageUrl };
  }
  if (!env.allowDevAuth) return null;
  const jar = await cookies();
  return decodeDevSession(jar.get(DEV_COOKIE)?.value);
}

/** Where to send an anonymous visitor to sign in. */
export function signInPath(returnTo?: string) {
  const base = env.clerk.configured ? "/sign-in" : "/dev-login";
  return returnTo ? `${base}?redirect_url=${encodeURIComponent(returnTo)}` : base;
}
