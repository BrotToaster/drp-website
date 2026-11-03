import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizationContext } from "@/lib/authz";
import { createCloudinaryPrivateDownloadUrl } from "@/lib/cloudinary";
import { canViewInternalDocument } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await context.params;
  const [authorization, asset] = await Promise.all([
    getAuthorizationContext(session.user.id),
    prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        documentRevisions: {
          select: { revision: { select: { document: { select: { categoryId: true, accessMode: true, archivedAt: true, roleAccess: true } } } } },
        },
      },
    }),
  ]);
  if (!asset || asset.visibility !== "INTERNAL") return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  const allowed = asset.documentRevisions.some(({ revision }) =>
    !revision.document.archivedAt && canViewInternalDocument(authorization, revision.document),
  );
  if (!allowed) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  try {
    const range = request.headers.get("range");
    const upstream = await fetch(createCloudinaryPrivateDownloadUrl(asset.publicId, asset.resourceType), {
      headers: range ? { Range: range } : {}, cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Datei ist derzeit nicht verfügbar." }, { status: 502 });
    const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox; frame-ancestors 'none'" });
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(key); if (value) headers.set(key, value);
    }
    if (asset.kind === "DOCUMENT") headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(asset.originalName)}`);
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ error: "Datei ist derzeit nicht verfügbar." }, { status: 503 });
  }
}
