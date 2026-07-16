import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isBotAuthorized } from "@/lib/bot-auth";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  type: z.string().min(1).max(100),
  discordGuildId: z.string().max(30).optional(),
  source: z.string().min(1).max(50).default("discord-bot"),
  data: z.unknown(),
  occurredAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  if (!isBotAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const event = await prisma.botEvent.create({
    data: {
      type: parsed.data.type,
      discordGuildId: parsed.data.discordGuildId,
      source: parsed.data.source,
      data: parsed.data.data as Prisma.InputJsonValue,
      occurredAt: parsed.data.occurredAt
        ? new Date(parsed.data.occurredAt)
        : new Date(),
    },
  });
  return NextResponse.json({ event }, { status: 201 });
}
