import "server-only";
import { getDb, schema } from "@/db";
import { APP_URL, BRAND, SUPPORT_EMAIL, env } from "./env";
import { reportError } from "./audit";

export interface Mail {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  template?: string;
}

/**
 * Send an email. With RESEND_API_KEY set it goes through Resend; otherwise it is
 * written to the email_outbox table (visible in /admin/outbox) so the whole flow
 * can be exercised locally. Every attempt is logged either way.
 */
export async function sendMail(mail: Mail): Promise<{ ok: boolean; id?: string }> {
  const db = await getDb();
  const to = [...new Set(mail.to.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  if (to.length === 0) return { ok: false };

  if (!env.email.configured) {
    const [row] = await db
      .insert(schema.emailOutbox)
      .values({ toAddresses: to, subject: mail.subject, text: mail.text, html: mail.html ?? null, template: mail.template ?? null, provider: "outbox", status: "queued" })
      .returning({ id: schema.emailOutbox.id });
    console.log(`[email → outbox #${row.id}] to=${to.join(",")} :: ${mail.subject}`);
    return { ok: true, id: String(row.id) };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(env.email.apiKey);
    const res = await resend.emails.send({ from: env.email.from, to, replyTo: SUPPORT_EMAIL, subject: mail.subject, text: mail.text, html: mail.html });
    if (res.error) throw new Error(res.error.message);
    await db.insert(schema.emailOutbox).values({ toAddresses: to, subject: mail.subject, text: mail.text, html: mail.html ?? null, template: mail.template ?? null, provider: "resend", providerId: res.data?.id ?? null, status: "sent" });
    return { ok: true, id: res.data?.id };
  } catch (err) {
    reportError(err, { where: "sendMail", subject: mail.subject });
    await db.insert(schema.emailOutbox).values({ toAddresses: to, subject: mail.subject, text: mail.text, html: mail.html ?? null, template: mail.template ?? null, provider: "resend", status: "failed", error: String(err) });
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Templates (plain text first — contractors read these on a phone in a truck)
// ---------------------------------------------------------------------------

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#14181f">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0f172a;color:#fff;padding:14px 20px;font-weight:600">${BRAND}</div>
    <div style="padding:20px;font-size:15px;line-height:1.5"><h2 style="margin:0 0 12px;font-size:18px">${title}</h2>${bodyHtml}</div>
    <div style="padding:12px 20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">You're receiving this because you have a ${BRAND} account. Questions: ${SUPPORT_EMAIL}</div>
  </div></body></html>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function reminderMail(input: { to: string[]; orgName: string; title: string; daysBefore: number; expiresOn: string; details: string[]; href: string }): Mail {
  const when = input.daysBefore === 0 ? "expires today" : `expires in ${input.daysBefore} days`;
  const subject = `${input.title} ${when} (${input.expiresOn})`;
  const text = [`${input.orgName}: ${input.title} ${when}, on ${input.expiresOn}.`, "", ...input.details, "", `Open in ${BRAND}: ${APP_URL}${input.href}`].join("\n");
  const html = layout(
    subject,
    `<p>${esc(input.orgName)}: <strong>${esc(input.title)}</strong> ${when}, on <strong>${esc(input.expiresOn)}</strong>.</p>
     <ul>${input.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
     <p><a href="${APP_URL}${input.href}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open in ${BRAND}</a></p>`
  );
  return { to: input.to, subject, text, html, template: "reminder" };
}

export function inviteMail(input: { to: string; orgName: string; inviterName: string; token: string; role: string }): Mail {
  const url = `${APP_URL}/invite/${input.token}`;
  const subject = `${input.inviterName} invited you to ${input.orgName} on ${BRAND}`;
  const text = `${input.inviterName} invited you to join ${input.orgName} on ${BRAND} as a ${input.role}.\n\nAccept: ${url}\n\nThis link expires in 7 days.`;
  const html = layout(subject, `<p>${esc(input.inviterName)} invited you to join <strong>${esc(input.orgName)}</strong> as a ${esc(input.role)}.</p><p><a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Accept invitation</a></p><p style="color:#64748b;font-size:13px">This link expires in 7 days.</p>`);
  return { to: [input.to], subject, text, html, template: "invite" };
}

export function welcomeMail(input: { to: string; name: string | null; orgName: string; trialDays: number }): Mail {
  const subject = `Welcome to ${BRAND} — your ${input.trialDays}-day trial has started`;
  const text = `Hi ${input.name ?? "there"},\n\n${input.orgName} is set up. Add the towns you pull permits in, enter each registration's issue date, and we'll compute the expiry and remind you 60, 30 and 14 days out.\n\n${APP_URL}/app\n\nReply to this email if anything about a village's rules looks wrong — we verify and fix.`;
  const html = layout(subject, `<p>Hi ${esc(input.name ?? "there")},</p><p><strong>${esc(input.orgName)}</strong> is set up. Add the towns you pull permits in, enter each registration's issue date, and we'll compute the expiry and remind you 60, 30 and 14 days out.</p><p><a href="${APP_URL}/app" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Go to your dashboard</a></p>`);
  return { to: [input.to], subject, text, html, template: "welcome" };
}

export function trialEndingMail(input: { to: string[]; orgName: string; daysLeft: number }): Mail {
  const subject = `${input.orgName}: your ${BRAND} trial ends in ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}`;
  const text = `Your free trial ends in ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}. Pick a plan to keep your reminders running:\n\n${APP_URL}/app/settings/billing\n\nNothing is deleted if you don't — your account just goes read-only until you subscribe.`;
  const html = layout(subject, `<p>Your free trial ends in <strong>${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}</strong>. Pick a plan to keep your reminders running.</p><p><a href="${APP_URL}/app/settings/billing" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Choose a plan</a></p><p style="color:#64748b;font-size:13px">Nothing is deleted if you don't — your account goes read-only until you subscribe.</p>`);
  return { to: input.to, subject, text, html, template: "trial_ending" };
}

export function paymentFailedMail(input: { to: string[]; orgName: string }): Mail {
  const subject = `${input.orgName}: payment failed on ${BRAND}`;
  const text = `We couldn't charge the card on file for ${input.orgName}. Update it here to avoid interruption:\n\n${APP_URL}/app/settings/billing`;
  const html = layout(subject, `<p>We couldn't charge the card on file for <strong>${esc(input.orgName)}</strong>.</p><p><a href="${APP_URL}/app/settings/billing" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Update payment method</a></p>`);
  return { to: input.to, subject, text, html, template: "payment_failed" };
}
