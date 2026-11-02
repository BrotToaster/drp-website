import { seedBase } from "./seed.mjs";
import { assertPreviewDatabase } from "./preview-guard.mjs";

export async function resetPreviewDatabase(db, installationId) {
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(184734982)");
    await assertPreviewDatabase(tx, installationId);
    const tables = await tx.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
    if (tables.some(row => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(row.tablename))) throw new Error("Unerwarteter Tabellenname.");
    if (tables.length) await tx.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map(row => 'public."' + row.tablename + '"').join(',') + ' RESTART IDENTITY CASCADE');
    await seedBase(tx);
    const users = [
      ["member", "Mitglied Beispiel", "PLAYER"], ["staff", "Team Beispiel", "MODERATOR"],
      ["admin", "Verwaltung Beispiel", "OWNER"], ["other", "Anderes Mitglied Beispiel", "PLAYER"],
    ];
    for (const [key, name, roleKey] of users) {
      const user = await tx.user.create({ data: { id: `preview-${key}`, name, registrationCompleted: true } });
      const role = await tx.accessRole.findUniqueOrThrow({ where: { key: roleKey } });
      await tx.userRoleAssignment.create({ data: { userId: user.id, roleId: role.id, source: "SYSTEM", sourceKey: "preview-fixture" } });
    }
    const category = await tx.ticketCategory.findUniqueOrThrow({ where: { key: "TECHNICAL" } });
    for (const [index, owner] of ["member", "other"].entries()) {
      await tx.ticket.create({ data: { id: `preview-ticket-${owner}`, number: index + 1, subject: `Beispielticket ${index + 1}: Anzeige im Profil`, userId: `preview-${owner}`, categoryId: category.id, messages: { create: [{ authorId: `preview-${owner}`, content: "Dies ist eine künstliche Supportanfrage zum Ausprobieren der Website." }, { authorId: "preview-staff", content: "Interne Testnotiz – nur für das zuständige Team.", internal: true }] } } });
    }
    const documents = await tx.internalDocumentCategory.findUniqueOrThrow({ where: { slug: "allgemein" } });
    const text = "Beispieldokument für die Entscheidungsvorschau. Es enthält keine echten Teamunterlagen.";
    const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
    const document = await tx.internalDocument.create({ data: { id: "preview-document", categoryId: documents.id, slug: "vorschau-handbuch", title: "Handbuch – Beispiel", creatorId: "preview-admin" } });
    await tx.internalDocumentRevision.create({ data: { documentId: document.id, version: 1, content, searchText: text, editorId: "preview-admin" } });
    const calendar = await tx.calendarCategory.findUniqueOrThrow({ where: { slug: "community" } });
    const event = await tx.calendarEvent.create({ data: { id: "preview-event", categoryId: calendar.id, slug: "vorschau-communityabend", creatorId: "preview-admin" } });
    const start = new Date(Date.now() + 3 * 86400000);
    await tx.calendarEventRevision.create({ data: { eventId: event.id, status: "PUBLISHED", title: "Communityabend – Beispieltermin", summary: "Fiktiver Termin zum Ausprobieren des Kalenders.", content, searchText: "Communityabend Beispiel", startsAt: start, endsAt: new Date(start.getTime() + 3600000), editorId: "preview-admin", publishedAt: new Date() } });
    await tx.siteSetting.upsert({ where: { key: "legal.settings" }, update: { value: { imprintEnabled: false, privacyPublished: false, operatorName: process.env.PREVIEW_OPERATOR_NAME || "Max Mustermann", country: "Schweiz", contactEmail: process.env.PREVIEW_OPERATOR_EMAIL || "kontakt@example.invalid", sampleDetails: !process.env.PREVIEW_OPERATOR_NAME, donations: "NONE" } }, create: { key: "legal.settings", value: {} } });
    await tx.siteSetting.upsert({ where: { key: "preview.lastReset" }, create: { key: "preview.lastReset", value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
  }, { timeout: 120000, maxWait: 10000 });
}
