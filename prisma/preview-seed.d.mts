import type { PrismaClient } from "@prisma/client";
export function resetPreviewDatabase(db: PrismaClient, installationId?: string): Promise<void>;
