import type { Prisma } from "@prisma/client";
// Both member and guest creation hold this lock until their insert commits.
export async function nextTicketNumber(tx: Pick<Prisma.TransactionClient, "$executeRaw" | "ticket">) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(184734983)`;
  const latest = await tx.ticket.aggregate({ _max: { number: true } });
  return (latest._max.number || 0) + 1;
}
