"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireOrg, requireRole } from "../tenancy";
import { env } from "../env";
import { isPlanId } from "../plans";
import { createCheckoutUrl, createPortalUrl, setPlanWithoutStripe } from "../billing";
import { formError, str, withError } from "../forms";

export async function startCheckout(formData: FormData) {
  const ctx = await requireOrg("/app/settings/billing");
  let url: string;
  try {
    requireRole(ctx, ["owner", "admin"]);
    const plan = str(formData, "plan");
    if (!isPlanId(plan)) throw new Error("Choose a plan");
    if (!env.stripe.configured) {
      await setPlanWithoutStripe(ctx.org.id, plan, ctx.user.id);
      revalidatePath("/app", "layout");
      redirect("/app/settings/billing?checkout=dev");
    }
    url = await createCheckoutUrl(ctx.org, plan, ctx.user.email, ctx.user.id);
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/settings/billing", formError(err)));
  }
  redirect(url);
}

export async function openBillingPortal() {
  const ctx = await requireOrg("/app/settings/billing");
  let url: string;
  try {
    requireRole(ctx, ["owner", "admin"]);
    if (!env.stripe.configured) throw new Error("Billing portal is available once Stripe is connected.");
    url = await createPortalUrl(ctx.org, ctx.user.email);
  } catch (err) {
    unstable_rethrow(err);
    redirect(withError("/app/settings/billing", formError(err)));
  }
  redirect(url);
}

/** Dev only: reset to trial to test the trial flow. */
export async function resetTrialDev() {
  const ctx = await requireOrg("/app/settings/billing");
  requireRole(ctx, ["owner"]);
  await setPlanWithoutStripe(ctx.org.id, "trial", ctx.user.id);
  revalidatePath("/app", "layout");
  redirect("/app/settings/billing?checkout=dev");
}
