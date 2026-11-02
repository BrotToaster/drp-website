import type { PrismaClient, Prisma } from "@prisma/client";
export function seedBase(db?: PrismaClient | Prisma.TransactionClient): Promise<void>;
