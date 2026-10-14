"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_COOKIE, encodeDevSession } from "../auth";
import { env } from "../env";
import { ORG_COOKIE } from "../tenancy";
import { str, withError } from "../forms";

/** Cookie-based sign-in used only when Clerk isn't configured. */
export async function devSignIn(formData: FormData) {
  if (env.clerk.configured || !env.allowDevAuth) redirect("/sign-in");
  const parsed = z
    .object({ email: z.string().trim().email("Enter a valid email"), name: z.string().trim().max(80) })
    .safeParse({ email: str(formData, "email"), name: str(formData, "name") });
  if (!parsed.success) redirect(withError("/dev-login", parsed.error.issues[0].message));
  const jar = await cookies();
  jar.set(DEV_COOKIE, encodeDevSession({ email: parsed.data.email.toLowerCase(), name: parsed.data.name || null }), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  jar.delete(ORG_COOKIE);
  const redirectUrl = str(formData, "redirect_url");
  redirect(redirectUrl.startsWith("/") ? redirectUrl : "/app");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
  jar.delete(ORG_COOKIE);
  redirect("/");
}
