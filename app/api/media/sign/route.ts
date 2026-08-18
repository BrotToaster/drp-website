import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createCloudinaryUploadSignature } from "@/lib/cloudinary";
import { getAuthorizationContext } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";

const requestSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  bytes: z.number().int().positive(),
  scope: z.enum(["public", "internal"]).default("public"),
});

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const audioTypes = new Set(["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const documentTypes = new Set(["application/pdf"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const authorization = await getAuthorizationContext(session.user.id);
  const canEditPublic =
    hasPermission(authorization, "rules.edit") ||
    hasPermission(authorization, "news.edit") ||
    hasPermission(authorization, "rules.create") ||
    hasPermission(authorization, "news.create") ||
    hasPermission(authorization, "faq.manage") ||
    hasPermission(authorization, "team.manage") ||
    hasPermission(authorization, "site.manage") ||
    authorization.calendarAccess.some((access) => access.canCreate || access.canManage);
  const canEditInternal = hasPermission(authorization, "documents.access") && authorization.documentAccess.some((access) => access.canCreate || access.canEdit || access.canManage);
  if (
    !canEditPublic && !canEditInternal
  ) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Datei." }, { status: 400 });

  const { mimeType, bytes, scope } = parsed.data;
  if (scope === "internal" && !canEditInternal) return NextResponse.json({ error: "Keine Berechtigung für interne Dateien." }, { status: 403 });
  if (scope === "public" && !canEditPublic) return NextResponse.json({ error: "Keine Berechtigung für öffentliche Medien." }, { status: 403 });
  const kind = imageTypes.has(mimeType)
    ? "IMAGE"
    : audioTypes.has(mimeType)
      ? "AUDIO"
      : videoTypes.has(mimeType)
        ? "VIDEO"
        : scope === "internal" && documentTypes.has(mimeType)
          ? "DOCUMENT"
        : null;
  const limit = kind === "IMAGE" ? 10_000_000 : kind === "AUDIO" || kind === "DOCUMENT" ? 25_000_000 : kind === "VIDEO" ? 100_000_000 : 0;
  if (!kind || bytes > limit) {
    return NextResponse.json({ error: "Dateityp oder Dateigröße ist nicht erlaubt." }, { status: 400 });
  }
  const resourceType = kind === "IMAGE" ? "image" : kind === "DOCUMENT" ? "raw" : "video";
  return NextResponse.json({
    ...createCloudinaryUploadSignature(resourceType, scope === "internal"),
    kind,
    originalName: parsed.data.name,
    mimeType,
    bytes,
    scope,
  });
}
