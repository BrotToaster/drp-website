export async function assertPreviewDatabase(db, installationId) {
  if (!installationId || installationId.length < 24) throw new Error("Vorschau-Datenbankkennung fehlt.");
  const rows = await db.$queryRawUnsafe('SELECT id FROM drp_preview_guard.installation');
  if (rows.length !== 1 || rows[0].id !== installationId) throw new Error("Keine passende isolierte Vorschau-Datenbank.");
}
