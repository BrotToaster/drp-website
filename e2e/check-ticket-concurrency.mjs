import { randomUUID } from "node:crypto";
import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { nextTicketNumber } from "../lib/ticket-number.ts";

// Only synthetic local/CI data is touched; never a community or hosted DB.
const url = new URL(process.env.DATABASE_URL || "");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || !/^\/drp_(?:ci|regression_readiness_\d+)$/.test(url.pathname)) throw new Error("Lokale Regression-/CI-Datenbank erforderlich.");
const db = new PrismaClient();
const ids = Array.from({ length: 12 }, () => "test-concurrent-" + randomUUID());
try {
  const category = await db.ticketCategory.findFirst({ select: { id: true } });
  const user = await db.user.findFirst({ select: { id: true } });
  assert(category && user, "Synthetische Testkategorie und Testkonto erforderlich.");
  const tickets = await Promise.all(ids.map((id, index) => db.$transaction(async tx => {
    const number = await nextTicketNumber(tx);
    // Give competing guest/member writes time to overlap after allocation.
    await new Promise(resolve => setTimeout(resolve, 15));
    return tx.ticket.create({ data: { id, number, categoryId: category.id, userId: index % 2 ? user.id : null, subject: "Synthetischer Parallelitätstest" } });
  }, { maxWait: 15_000, timeout: 15_000 })));
  assert.equal(new Set(tickets.map(ticket => ticket.number)).size, ids.length);
  assert.equal(await db.ticket.count({ where: { id: { in: ids } } }), ids.length);
  const result = { simultaneousTickets: tickets.length, distinctNumbers: tickets.length, guestAndMemberWrites: true };
  fs.mkdirSync("logs", { recursive: true });
  fs.writeFileSync("logs/ticket-concurrency.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await db.ticket.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
