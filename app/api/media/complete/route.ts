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
  kind: z.enum(["IMAGE", "AUDIO", "VIDEO"]),
  mimeType: z.string().min(1).max(100),
  originalName: z.string().min(1).max(255),
  bytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  version: z.number().int().positive(),
  signature: z.string().length(40),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  const authorization = await getAuthorizationContext(session.user.id);
  if (
    !hasPermission(authorization, "rules.edit") &&
    !hasPermission(authorization, "news.edit") &&
    !hasPermission(authorization, "rules.create") &&
    !hasPermission(authorization, "news.create")
  ) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Upload-Antwort." }, { status: 400 });
  const data = parsed.data;
  if (!verifyCloudinaryUpload(data.publicId, data.version, data.signature)) {
    return NextResponse.json({ error: "Upload-Signatur ist ungültig." }, { status: 400 });
  }
  const expectedHost = "res.cloudinary.com";
  if (new URL(data.secureUrl).hostname !== expectedHost) {
    return NextResponse.json({ error: "Ungültige Medien-URL." }, { status: 400 });
  }
  const limit = data.kind === "IMAGE" ? 10_000_000 : data.kind === "AUDIO" ? 25_000_000 : 100_000_000;
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
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ id: asset.id, url: asset.secureUrl, kind: asset.kind });
}