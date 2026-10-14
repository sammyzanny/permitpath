import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/** Uptime probe: checks the database round-trip. */
export async function GET() {
  try {
    const db = await getDb();
    const res = (await db.execute(sql`select count(*)::int as n from jurisdictions`)) as unknown as { rows?: Array<{ n: number }> } | Array<{ n: number }>;
    const rows = Array.isArray(res) ? res : (res.rows ?? []);
    return NextResponse.json({ ok: true, jurisdictions: rows[0]?.n ?? null, time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
