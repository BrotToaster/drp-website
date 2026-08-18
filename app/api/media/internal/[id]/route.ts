import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthorizationContext } from "@/lib/authz";
import { createCloudinaryPrivateDownloadUrl } from "@/lib/cloudinary";
import { canAccessDocumentCategory } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const { id } = await context.params;
  const [authorization, asset] = await Promise.all([
    getAuthorizationContext(session.user.id),
    prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        documentRevisions: {
          select: { revision: { select: { document: { select: { categoryId: true, archivedAt: true } } } } },
        },
      },
    }),
  ]);
  if (!asset || asset.visibility !== "INTERNAL") return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  const allowed = asset.documentRevisions.some(({ revision }) =>
    !revision.document.archivedAt && canAccessDocumentCategory(authorization, revision.document.categoryId, "canView"),
  );
  if (!allowed) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  try {
    return NextResponse.redirect(createCloudinaryPrivateDownloadUrl(asset.publicId, asset.resourceType), {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Datei ist derzeit nicht verfügbar." }, { status: 503 });
  }
}
