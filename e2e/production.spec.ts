import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Full-product end-to-end run in dev-auth mode (no Clerk/Stripe keys):
 * public site → sign-up → onboarding → towns → documents (real upload) →
 * team invite/accept → billing & plan limits → admin edit → tenant isolation.
 *
 * Server must be running with: ALLOW_DEV_AUTH=1 ADMIN_EMAILS=admin@towncert.com
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const SHOTS = process.env.SHOTS_DIR ?? "e2e/shots";
const run = Date.now().toString(36);
const OWNER = `owner-${run}@example.com`;
const TEAMMATE = `mate-${run}@example.com`;
const OUTSIDER = `outsider-${run}@example.com`;
const ADMIN = "admin@towncert.com";
const COMPANY = `Test Electric ${run}`;

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, name = "Test User") {
  await page.context().clearCookies();
  await page.goto(`${BASE}/dev-login`);
  await page.fill("#email", email);
  await page.fill("#name", name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/dev-login"));
}

test("public site: landing, directory, town page with JSON-LD", async ({ page }) => {
  await page.goto(BASE + "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every village");
  await page.screenshot({ path: `${SHOTS}/p01-landing.png`, fullPage: true });
  await page.goto(BASE + "/rules");
  await expect(page.getByText(/37 of 37 jurisdictions shown/)).toBeVisible();
  await page.goto(BASE + "/rules/steger");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Steger contractor license");
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('"GovernmentService"');
  await expect(page.getByText("Start 14-day free trial")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p02-public-town.png`, fullPage: true });
});

test("sign up → onboarding creates org with selected towns", async ({ page }) => {
  await signIn(page, OWNER, "Olivia Owner");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.fill("#name", COMPANY);
  await page.selectOption("#trade", "Electrical");
  for (const town of ["Steger", "Tinley Park", "Park Forest"]) {
    await page.getByRole("button", { name: new RegExp(`^${town}\\b`) }).click();
  }
  await expect(page.getByText("3 selected")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p03-onboarding.png`, fullPage: true });
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/app\?welcome=1$/);
  await expect(page.getByText("Welcome!")).toBeVisible();
  await expect(page.getByText(/tracking 3 towns/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p04-dashboard-new.png`, fullPage: true });
});

test("town detail computes expiry from the town rule (fixed Apr 30 and rolling)", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/towns");
  await page.getByRole("link", { name: "Steger", exact: true }).click();
  await page.selectOption("#status", "active");
  await page.fill("#issuedOn", "2026-06-15");
  await page.fill("#licenseNumber", "GC-26-901");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.locator("#expiresOn")).toHaveValue("2027-04-30");

  await page.goto(BASE + "/app/towns");
  await page.getByRole("link", { name: "Park Forest", exact: true }).click();
  await page.selectOption("#status", "active");
  await page.fill("#issuedOn", "2026-09-01");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#expiresOn")).toHaveValue("2027-09-01");
  await page.screenshot({ path: `${SHOTS}/p05-town-detail.png`, fullPage: true });
});

test("documents: real PDF upload, served only to the org, conflict detection", async ({ page }) => {
  await signIn(page, OWNER);
  const pdfPath = path.join("e2e", "fixtures", "coi.pdf");
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

  await page.goto(BASE + "/app/documents");
  await page.selectOption("#kind", "coi");
  await page.fill("#title", "General liability COI — $1M/$2M");
  await page.fill("#issuer", "West Bend Mutual");
  await page.fill("#amount", "1000000");
  await page.fill("#effectiveOn", "2026-03-01");
  await page.fill("#expiresOn", "2027-03-01"); // 60 days before Steger's 2027-04-30 → conflict
  await page.setInputFiles("#file", pdfPath);
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const fileLink = page.getByRole("link", { name: /coi\.pdf/ });
  await expect(fileLink).toBeVisible();
  await expect(page.getByText(/1 document conflict/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p06-documents.png`, fullPage: true });

  const href = await fileLink.getAttribute("href");
  const res = await page.request.get(BASE + href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");

  // An outsider must not be able to fetch it.
  await signIn(page, OUTSIDER, "Otto Outsider");
  const denied = await page.request.get(BASE + href!);
  expect([401, 404]).toContain(denied.status());
});

test("tenant isolation: outsider cannot open another org's town", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/towns");
  const href = await page.getByRole("link", { name: "Steger", exact: true }).getAttribute("href");
  await signIn(page, OUTSIDER);
  // Outsider has no org → onboarding; give them one so /app renders.
  await page.goto(BASE + "/onboarding");
  await page.fill("#name", `Outsider Co ${run}`);
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/app\?welcome=1$/);
  const res = await page.goto(BASE + href!);
  expect(res?.status()).toBe(404);
});

test("team: invite → email in outbox → accept as invitee → appears as member", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/settings/team");
  await page.fill("#email", TEAMMATE);
  await page.selectOption("#role", "member");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("Invitation sent.")).toBeVisible();
  await expect(page.getByText(TEAMMATE)).toBeVisible();

  // Pull the invite link out of the email outbox (admin-only page).
  await signIn(page, ADMIN, "Platform Admin");
  await page.goto(BASE + "/admin/outbox");
  const body = await page.content(); // invite bodies sit inside collapsed <details>
  const m = body.match(/\/invite\/([A-Za-z0-9_-]{20,})/);
  expect(m).not.toBeNull();
  const token = m![1];

  await signIn(page, TEAMMATE, "Mia Mate");
  await page.goto(`${BASE}/invite/${token}`);
  await expect(page.getByText(new RegExp(`join.*${COMPANY}`))).toBeVisible();
  await page.getByRole("button", { name: /Accept and open/ }).click();
  await expect(page).toHaveURL(/\/app\?joined=1$/);
  await expect(page.getByText(`You've joined ${COMPANY}.`)).toBeVisible();

  // Member sees towns but cannot manage team.
  await page.goto(BASE + "/app/settings/team");
  await expect(page.getByText("Mia Mate")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/p07-team.png`, fullPage: true });
});

test("billing (dev mode): choose Solo enforces 5-town limit; Crew lifts it", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/settings/billing");
  await expect(page.getByText("Free trial")).toBeVisible();
  await page.locator('form:has(input[value="solo"]) button').click();
  await expect(page).toHaveURL(/checkout=dev/);
  await expect(page.getByText("Solo", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p08-billing.png`, fullPage: true });

  // We have 3 towns; Solo allows 5 → picker limit is 2.
  await page.goto(BASE + "/app/towns/add");
  await expect(page.getByText(/plan limit 2/)).toBeVisible();
  for (const town of ["Crete", "Homewood"]) await page.getByRole("button", { name: new RegExp(`^${town}\\b`) }).click();
  await expect(page.getByRole("button", { name: /^Matteson\b/ })).toBeDisabled();
  await page.getByRole("button", { name: "Add selected towns" }).click();
  await expect(page).toHaveURL(/\/app\/towns\?added=1$/);
  await page.goto(BASE + "/app/towns/add");
  await expect(page.getByText(/reached the Solo plan limit/)).toBeVisible();

  await page.goto(BASE + "/app/settings/billing");
  await page.locator('form:has(input[value="crew"]) button').click();
  await page.goto(BASE + "/app/towns/add");
  await expect(page.getByText(/reached the .* plan limit/)).toHaveCount(0);
});

test("customer reports a rule problem → admin sees it, edits the town with a revision, public page updates", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/rules/steger");
  await page.selectOption('select[name="field"]', "Fee");
  await page.fill('textarea[name="message"]', "Village Hall says the GC fee is now $175 as of this year.");
  await page.getByRole("button", { name: "Report a problem" }).click();
  await expect(page.getByText(/Thanks — we/)).toBeVisible();

  await signIn(page, ADMIN, "Platform Admin");
  await page.goto(BASE + "/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p09-admin.png`, fullPage: true });
  await page.goto(BASE + "/admin/reports");
  await expect(page.getByText("Village Hall says the GC fee is now $175")).toBeVisible();

  await page.goto(BASE + "/admin/jurisdictions/steger");
  await page.fill("#feeGcText", `$175 (e2e ${run})`);
  await page.fill("#revisionNote", "e2e test edit");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByText("e2e test edit")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p10-admin-edit.png`, fullPage: true });

  await page.goto(BASE + "/rules/steger");
  await expect(page.getByText(`Registration fee — $175 (e2e ${run})`)).toBeVisible();

  // Revert so the seed data stays clean.
  await page.goto(BASE + "/admin/jurisdictions/steger");
  await page.fill("#feeGcText", "$150");
  await page.fill("#revisionNote", "e2e revert");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
});

test("calendar page and .ics feed", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/app/calendar");
  await expect(page.getByText("Renewal calendar")).toBeVisible();
  await page.getByRole("button", { name: "Run reminder check now" }).click();
  await expect(page.getByText(/Reminder check complete/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/p11-calendar.png`, fullPage: true });
  const ics = await page.request.get(BASE + "/api/calendar.ics");
  expect(ics.status()).toBe(200);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("Steger contractor registration expires");
});

test("non-admin cannot reach /admin", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto(BASE + "/admin");
  await expect(page).toHaveURL(/\/app\?denied=admin$/);
});
