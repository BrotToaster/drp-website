import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizationContext } from "@/lib/authz";
import { getErlcLiveMapSnapshot } from "@/lib/erlc-live";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    const authorization = await getAuthorizationContext(session.user.id);
    if (!hasPermission(authorization, "erlc.details.view")) {
      return NextResponse.json({ error: "Keine Berechtigung für ER:LC-Livedaten." }, { status: 403 });
    }
    const snapshot = await getErlcLiveMapSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "ER:LC-Livedaten sind vorübergehend nicht verfügbar." }, {
      status: 503,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }
}
