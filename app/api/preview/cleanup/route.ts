import { NextResponse } from "next/server";
import { hostedPreviewEnabled, matchesSecretHash } from "@/lib/preview-mode";
import { cleanupPreview } from "@/lib/preview-maintenance";

export async function GET(request: Request) {
  if (!hostedPreviewEnabled()) return new NextResponse(null, { status: 404 });
  if (!(await matchesSecretHash(request.headers.get("authorization")?.replace(/^Bearer /, "") || "", process.env.CRON_SECRET_HASH))) return new NextResponse(null, { status: 401 });
  try { return NextResponse.json({ ok: true, removed: await cleanupPreview() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
