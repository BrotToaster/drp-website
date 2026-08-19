import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { verifyCloudinaryUpload } from "@/lib/cloudinary";
import { getAuthorizationContext } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  publicId: z.string().min(1).max(255),
  secureUrl: z.string().url(),
  resourceType: z.enum(["image", "video", "raw"]),
  kind: z.enum(["IMAGE", "AUDIO", "VIDEO", "DOCUMENT"]),
  mimeType: z.string().min(1).max(100),
  originalName: z.string().min(1).max(255),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  version: z.number().int().positive(),
  signature: z.string().length(40),
  deliveryType: z.enum(["upload", "authenticated"]).optional(),
});

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const audioTypes = new Set(["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const documentTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

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
  const canEditInternal = hasPermission(authorization, "documents.access") && (authorization.isOwner || authorization.documentAccess.some((access) => access.canCreate || access.canEdit || access.canManage));
  if (
    !canEditPublic && !canEditInternal
  ) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Upload-Antwort." }, { status: 400 });
  const data = parsed.data;
  const internal = data.publicId.startsWith("drp-internal/");
  const publicContent = data.publicId.startsWith("drp-content/");
  if (!internal && !publicContent) return NextResponse.json({ error: "Ungültiger Upload-Ordner." }, { status: 400 });
  if ((internal && data.deliveryType !== "authenticated") || (publicContent && data.deliveryType === "authenticated")) {
    return NextResponse.json({ error: "Upload-Sichtbarkeit stimmt nicht mit der Signatur überein." }, { status: 400 });
  }
  if (internal && !canEditInternal) return NextResponse.json({ error: "Keine Berechtigung für interne Dateien." }, { status: 403 });
  if (!internal && !canEditPublic) return NextResponse.json({ error: "Keine Berechtigung für öffentliche Medien." }, { status: 403 });
  if (!verifyCloudinaryUpload(data.publicId, data.version, data.signature)) {
    return NextResponse.json({ error: "Upload-Signatur ist ungültig." }, { status: 400 });
  }
  const expectedHost = "res.cloudinary.com";
  const secureUrl = new URL(data.secureUrl);
  if (secureUrl.hostname !== expectedHost || (internal ? !secureUrl.pathname.includes("/authenticated/") : !secureUrl.pathname.includes("/upload/"))) {
    return NextResponse.json({ error: "Ungültige Medien-URL." }, { status: 400 });
  }
  const expectedKind = imageTypes.has(data.mimeType) ? "IMAGE" : audioTypes.has(data.mimeType) ? "AUDIO" : videoTypes.has(data.mimeType) ? "VIDEO" : internal && documentTypes.has(data.mimeType) ? "DOCUMENT" : null;
  const expectedResourceType = expectedKind === "IMAGE" ? "image" : expectedKind === "DOCUMENT" ? "raw" : expectedKind ? "video" : null;
  if (!expectedKind || data.kind !== expectedKind || data.resourceType !== expectedResourceType) {
    return NextResponse.json({ error: "Medientyp stimmt nicht mit dem Upload überein." }, { status: 400 });
  }
  const limit = data.kind === "IMAGE" ? 10_000_000 : data.kind === "AUDIO" || data.kind === "DOCUMENT" ? 25_000_000 : 100_000_000;
  if (data.bytes > limit) return NextResponse.json({ error: "Datei ist zu groß." }, { status: 400 });

  const asset = await prisma.mediaAsset.upsert({
    where: { publicId: data.publicId },
    update: {
      secureUrl: data.secureUrl,
      resourceType: data.resourceType,
      kind: data.kind,
      mimeType: data.mimeType,
      originalName: data.originalName,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      duration: data.duration,
      visibility: internal ? "INTERNAL" : "PUBLIC",
      deliveryType: data.deliveryType || "upload",
    },
    create: {
      publicId: data.publicId,
      secureUrl: data.secureUrl,
      resourceType: data.resourceType,
      kind: data.kind,
      mimeType: data.mimeType,
      originalName: data.originalName,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      duration: data.duration,
      visibility: internal ? "INTERNAL" : "PUBLIC",
      deliveryType: data.deliveryType || "upload",
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ id: asset.id, url: asset.secureUrl, kind: asset.kind });
}
