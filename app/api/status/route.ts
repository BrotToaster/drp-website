import { NextResponse } from "next/server";
import { getPortalStatus } from "@/lib/service-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getPortalStatus(), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
