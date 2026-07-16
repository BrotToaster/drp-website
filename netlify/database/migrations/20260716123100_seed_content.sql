-- Initial public content for a fresh DRP deployment.
INSERT INTO "User" ("id", "name", "role", "registrationCompleted", "createdAt", "updatedAt") VALUES
  ('seed-owner', 'Mori', 'OWNER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-admin', 'Alex', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('seed-mod', 'Jamie', 'MODERATOR', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StaffProfile" ("id", "userId", "title", "department", "bio", "displayOrder", "visible") VALUES
  ('staff-owner', 'seed-owner', 'Projektleitung', 'Management', 'Verantwortlich für Vision, Community und die langfristige Entwicklung von DRP.', 1, true),
  ('staff-admin', 'seed-admin', 'Administration', 'Serverleitung', 'Koordiniert den Serverbetrieb und sorgt für klare interne Abläufe.', 2, true),
  ('staff-mod', 'seed-mod', 'Moderation', 'Community', 'Erste Anlaufstelle für Support, Konfliktklärung und Community-Fragen.', 3, true)
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "Rule" ("id", "slug", "category", "title", "content", "order", "version", "published", "createdAt", "updatedAt") VALUES
  ('rule-respekt', 'respekt-und-umgang', 'Grundregeln', 'Respekt und Umgang', 'Behandle alle Spieler respektvoll. Beleidigungen, Diskriminierung, Provokationen und gezieltes Stören des Spielerlebnisses werden nicht toleriert.', 1, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rule-roleplay', 'roleplay-qualitaet', 'Roleplay', 'Roleplay-Qualität', 'Handle nachvollziehbar, bleibe in deiner Rolle und gib jeder Situation Raum zur Entwicklung. Unrealistisches Verhalten und Fail-RP sind untersagt.', 2, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rule-rdm-vdm', 'rdm-und-vdm', 'Roleplay', 'RDM und VDM', 'Das grundlose Töten oder Anfahren anderer Spieler ist verboten. Gewalt benötigt immer einen plausiblen Roleplay-Hintergrund.', 3, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rule-verfolgung', 'verfolgungen', 'Einsatzregeln', 'Verfolgungen', 'Verfolgungen müssen fair und verhältnismäßig ausgespielt werden. Glitching und unrealistische Fahrmanöver sind verboten.', 4, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rule-kommunikation', 'kommunikation', 'Kommunikation', 'Kommunikation', 'Nutze die vorgesehenen Funk- und Sprachkanäle. Metagaming, Streamsniping und das Weitergeben interner Informationen sind untersagt.', 5, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rule-staff', 'staff-anweisungen', 'Support', 'Staff-Anweisungen', 'Den sachlichen Anweisungen des Staff-Teams ist Folge zu leisten. Entscheidungen können anschließend ruhig über ein Ticket überprüft werden.', 6, 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "NewsPost" ("id", "slug", "title", "excerpt", "content", "coverLabel", "published", "publishedAt", "authorId", "createdAt", "updatedAt") VALUES
  ('news-willkommen', 'willkommen-bei-drp', 'Willkommen bei DRP', 'Unser neues Serverportal ist da – klarer, schneller und näher an der Community.', 'Mit dem neuen Portal bündeln wir Regelwerk, Bewerbungen, Support und alle wichtigen Serverinformationen an einem Ort.', 'Community', true, '2026-07-12T18:00:00.000Z', 'seed-owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('news-bewerbungen', 'fraktionsbewerbungen', 'Fraktionsbewerbungen geöffnet', 'Sheriff, Police, Fire und DOT suchen engagierte Mitglieder.', 'Die nächste Bewerbungsphase läuft. Lies die Anforderungen und sende deine Bewerbung direkt über dein Dashboard ein.', 'Bewerbung', true, '2026-07-08T14:30:00.000Z', 'seed-owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('news-regelwerk', 'regelwerk-update', 'Regelwerk 2.3', 'Klarere Einsatzregeln und neue Hinweise für Verfolgungssituationen.', 'Das Regelwerk wurde sprachlich geschärft. Bestehende Grundsätze bleiben erhalten, einige Beispiele wurden ergänzt.', 'Update', true, '2026-07-02T16:00:00.000Z', 'seed-owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "BotRecord" ("id", "namespace", "key", "data", "createdAt", "updatedAt") VALUES
  ('bot-public-discord', 'public', 'discord', '{"inviteCode":"drpg","members":0,"online":0}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("namespace", "key") DO NOTHING;
