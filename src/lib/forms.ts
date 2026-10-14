import { z } from "zod";

/** Small helpers shared by server actions. */
export const optDate = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").nullable());

export const optNum = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : Number(s.replace(/[$,]/g, ""))))
  .pipe(z.number().finite().nullable());

export const optText = z
  .string()
  .trim()
  .max(4000)
  .transform((s) => (s === "" ? null : s));

export const reqText = (label: string, max = 200) => z.string().trim().min(1, `${label} is required`).max(max);

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export function formError(err: unknown): string {
  if (err instanceof z.ZodError) return err.issues.map((i) => i.message).join("; ");
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function withError(path: string, message: string) {
  const u = new URL(path, "http://x");
  u.searchParams.set("error", message.slice(0, 300));
  return u.pathname + u.search;
}

export function withOk(path: string, key = "saved") {
  const u = new URL(path, "http://x");
  u.searchParams.set(key, "1");
  return u.pathname + u.search;
}
