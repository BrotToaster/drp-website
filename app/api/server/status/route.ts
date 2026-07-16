import { NextResponse } from "next/server";
import { getPublicServerStatus } from "@/lib/erlc";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getPublicServerStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
