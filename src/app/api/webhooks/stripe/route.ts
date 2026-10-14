import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getStripe, handleStripeEvent } from "@/lib/billing";
import { reportError } from "@/lib/audit";

/**
 * Stripe webhook. Configure in the Stripe dashboard → Developers → Webhooks:
 *   URL: https://<your-domain>/api/webhooks/stripe
 *   Events: checkout.session.completed, customer.subscription.created,
 *           customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
 * Set STRIPE_WEBHOOK_SECRET to the signing secret it gives you.
 */
export async function POST(req: NextRequest) {
  if (!env.stripe.configured || !env.stripe.webhookSecret) return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const body = await req.text();
  try {
    const stripe = await getStripe();
    const event = stripe.webhooks.constructEvent(body, sig, env.stripe.webhookSecret);
    const outcome = await handleStripeEvent(event);
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    reportError(err, { where: "stripe webhook" });
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
