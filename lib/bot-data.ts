import { prisma } from "@/lib/prisma";

export async function getBotRecord<T>(
  namespace: string,
  key: string,
): Promise<T | null> {
  const record = await prisma.botRecord.findUnique({
    where: { namespace_key: { namespace, key } },
  });
  if (!record || (record.expiresAt && record.expiresAt < new Date())) return null;
  return record.data as T;
}
