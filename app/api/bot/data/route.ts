import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotAuthorized } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

const recordSchema = z.object({
  namespace: z.string().min(1).max(80),
  key: z.string().min(1).max(120),
  discordGuildId: z.string().max(30).optional(),
  data: z.unknown(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const namespace = url.searchParams.get("namespace");
  const key = url.searchParams.get("key");
  const records = await prisma.botRecord.findMany({
    where: {
      ...(namespace ? { namespace } : {}),
      ...(key ? { key } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 250,
  });
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = recordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const record = await prisma.botRecord.upsert({
    where: {
      namespace_key: { namespace: input.namespace, key: input.key },
    },
    update: {
      data: input.data as Prisma.InputJsonValue,
      discordGuildId: input.discordGuildId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    create: {
      namespace: input.namespace,
      key: input.key,
      data: input.data as Prisma.InputJsonValue,
      discordGuildId: input.discordGuildId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
  return NextResponse.json({ record }, { status: 201 });
}
