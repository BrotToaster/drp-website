import type { PrismaClient, Prisma } from "@prisma/client";
export function assertPreviewDatabase(db: PrismaClient | Prisma.TransactionClient, installationId?: string): Promise<void>;
