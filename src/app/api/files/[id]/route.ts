import { NextResponse, type NextRequest } from "next/server";
import { getOrgContext } from "@/lib/tenancy";
import { getDocument } from "@/lib/queries";
import { getFile } from "@/lib/storage";

/** Serve a vault file to a member of the owning org only. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const org = await getOrgContext();
  if (!org) return new NextResponse("Unauthorized", { status: 401 });
  const doc = await getDocument(org.org.id, Number(id));
  if (!doc || !doc.storageKey) return new NextResponse("Not found", { status: 404 });
  const res = await getFile(doc.storageKey);
  if ("redirectUrl" in res) return NextResponse.redirect(res.redirectUrl, 302);
  return new NextResponse(new Uint8Array(res.body), {
    headers: {
      "Content-Type": doc.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(doc.fileName ?? "document").replace(/[^\w. -]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
