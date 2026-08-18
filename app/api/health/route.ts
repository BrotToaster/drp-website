import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  const deploymentId = process.env.RAILWAY_DEPLOYMENT_ID?.trim();

  return NextResponse.json(
    {
      ok: true,
      service: "drp-website",
      version: commit ? commit.slice(0, 12) : "local",
      deploymentId: deploymentId || null,
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
