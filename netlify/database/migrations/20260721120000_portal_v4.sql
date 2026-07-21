-- DRP portal v4: reorganized panels, internal handbook, dynamic role cards and ER:LC telemetry.

ALTER TABLE "FaqItem" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Allgemein';
CREATE INDEX "FaqItem_category_visible_sortOrder_idx" ON "FaqItem"("category", "visible", "sortOrder");

CREATE TABLE "StaffFaqCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffFaqCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffFaqCategory_slug_key" ON "StaffFaqCategory"("slug");
CREATE INDEX "StaffFaqCategory_visible_sortOrder_idx" ON "StaffFaqCategory"("visible", "sortOrder");

CREATE TABLE "StaffFaqItem" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffFaqItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffFaqItem_categoryId_visible_sortOrder_idx" ON "StaffFaqItem"("categoryId", "visible", "sortOrder");
CREATE INDEX "StaffFaqItem_updatedAt_idx" ON "StaffFaqItem"("updatedAt");
ALTER TABLE "StaffFaqItem" ADD CONSTRAINT "StaffFaqItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StaffFaqCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffFaqItem" ADD CONSTRAINT "StaffFaqItem_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "HomepageRoleCard" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageId" TEXT,
  "targetUrl" TEXT,
  "linkLabel" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomepageRoleCard_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HomepageRoleCard_visible_sortOrder_idx" ON "HomepageRoleCard"("visible", "sortOrder");
ALTER TABLE "HomepageRoleCard" ADD CONSTRAINT "HomepageRoleCard_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HomepageRoleCard" ADD CONSTRAINT "HomepageRoleCard_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ErlcServerState" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "online" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'unavailable',
  "name" TEXT NOT NULL DEFAULT 'DRP Private Server',
  "currentPlayers" INTEGER,
  "maxPlayers" INTEGER,
  "queueCount" INTEGER,
  "staffCount" INTEGER,
  "vehicleCount" INTEGER,
  "emergencyCount" INTEGER,
  "modCallCount" INTEGER,
  "currentDetails" JSONB,
  "checkedAt" TIMESTAMP(3),
  "lastSuccessfulAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErlcServerState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErlcMetricSnapshot" (
  "id" TEXT NOT NULL,
  "players" INTEGER NOT NULL DEFAULT 0,
  "maxPlayers" INTEGER,
  "queueCount" INTEGER NOT NULL DEFAULT 0,
  "staffCount" INTEGER NOT NULL DEFAULT 0,
  "vehicleCount" INTEGER NOT NULL DEFAULT 0,
  "emergencyCount" INTEGER NOT NULL DEFAULT 0,
  "modCallCount" INTEGER NOT NULL DEFAULT 0,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErlcMetricSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ErlcMetricSnapshot_capturedAt_idx" ON "ErlcMetricSnapshot"("capturedAt");

INSERT INTO "Permission" ("id", "key", "label", "group") VALUES
  ('perm-staff-faq-view', 'staff_faq.view', 'Internes Staff-FAQ lesen', 'Wissen'),
  ('perm-staff-faq-manage', 'staff_faq.manage', 'Internes Staff-FAQ verwalten', 'Wissen'),
  ('perm-erlc-check', 'erlc.check', 'ER:LC-Status manuell prüfen', 'Serverbetrieb'),
  ('perm-erlc-details', 'erlc.details.view', 'Sensible ER:LC-Details anzeigen', 'Serverbetrieb')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "AccessRole" role CROSS JOIN "Permission" permission
WHERE role."key" IN ('SUPPORTER', 'MODERATOR', 'ADMIN', 'OWNER')
  AND permission."key" IN ('staff_faq.view', 'erlc.check')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "AccessRole" role CROSS JOIN "Permission" permission
WHERE role."key" IN ('MODERATOR', 'ADMIN', 'OWNER')
  AND permission."key" = 'erlc.details.view'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "AccessRole" role CROSS JOIN "Permission" permission
WHERE role."key" IN ('ADMIN', 'OWNER')
  AND permission."key" = 'staff_faq.manage'
ON CONFLICT DO NOTHING;

INSERT INTO "HomepageRoleCard" ("id", "code", "title", "description", "sortOrder", "updatedAt") VALUES
  ('homepage-role-polizei', 'POLIZEI', 'Polizei Deutschland', 'Sorge mit klaren Einsatzstrukturen, Ermittlungen und bürgernahem Roleplay für Sicherheit.', 10, CURRENT_TIMESTAMP),
  ('homepage-role-feuerwehr', 'FEUERWEHR', 'Berufsfeuerwehr Deutschland', 'Rette Leben, bekämpfe Brände und koordiniere Feuerwehr- und Rettungsdiensteinsätze.', 20, CURRENT_TIMESTAMP),
  ('homepage-role-moveberlin', 'MOVEBERLIN', 'MoveBerlin', 'Halte als Stadtwerke- und Infrastrukturdienst Straßen, Versorgung und Verkehr am Laufen.', 30, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StaffFaqCategory" ("id", "slug", "title", "description", "sortOrder", "updatedAt") VALUES
  ('staff-faq-cat-ranks', 'befoerderungen-und-raenge', 'Beförderungen & Ränge', 'Upranksperren, Aufsicht und Beförderungsentscheidungen.', 10, CURRENT_TIMESTAMP),
  ('staff-faq-cat-sanctions', 'verwarnungen-und-sanktionen', 'Verwarnungen & Sanktionen', 'Interne Ermahnungen, Strikes und Einsprüche.', 20, CURRENT_TIMESTAMP),
  ('staff-faq-cat-activity', 'aktivitaet', 'Aktivität', 'Zeitvorgaben, Fehlzeiten und Abmeldungen.', 30, CURRENT_TIMESTAMP),
  ('staff-faq-cat-moderation', 'moderation', 'Moderation', 'Eingriffe, Beweislage und Eskalationswege.', 40, CURRENT_TIMESTAMP),
  ('staff-faq-cat-discord', 'discord-und-bans', 'Discord & Bans', 'Discord-Sanktionen, Gebannt-Rolle und Entbannungen.', 50, CURRENT_TIMESTAMP),
  ('staff-faq-cat-tickets', 'beschwerden-und-tickets', 'Beschwerden & Tickets', 'Neutrale Bearbeitung, Zuständigkeit und Abschluss.', 60, CURRENT_TIMESTAMP),
  ('staff-faq-cat-general', 'allgemeine-fragen', 'Allgemeine Fragen', 'Grundsätze, Ausnahmen und Interessenkonflikte.', 70, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "StaffFaqItem" ("id", "categoryId", "question", "answer", "searchText", "sortOrder", "updatedAt") VALUES
  ('sfq-rank-1','staff-faq-cat-ranks','Wie lange dauert eine Upranksperre?','Die Dauer hängt von der jeweiligen Maßnahme ab und wird von der Leitung festgelegt.','wie lange dauert eine upranksperre dauer massnahme leitung',10,CURRENT_TIMESTAMP),
  ('sfq-rank-2','staff-faq-cat-ranks','Kann eine Upranksperre verkürzt werden?','Grundsätzlich nein. Ausnahmen können ausschließlich durch die Leitung genehmigt werden.','upranksperre verkuerzen ausnahme leitung',20,CURRENT_TIMESTAMP),
  ('sfq-rank-3','staff-faq-cat-ranks','Wann wird ein Teammitglied unter Aufsicht gestellt?','Wenn Zweifel an Eignung, Aktivität, Regelkenntnis oder Verhalten bestehen, kann die Leitung eine Phase unter Aufsicht anordnen.','under supervision aufsicht eignung aktivitaet regelkenntnis verhalten',30,CURRENT_TIMESTAMP),
  ('sfq-rank-4','staff-faq-cat-ranks','Ist eine Beförderung trotz Aufsicht möglich?','Sie ist grundsätzlich möglich, kann jedoch von der Leitung bis zur Klärung blockiert werden.','befoerderung aufsicht leitung blockiert',40,CURRENT_TIMESTAMP),
  ('sfq-rank-5','staff-faq-cat-ranks','Wer entscheidet über Beförderungen?','Beförderungen entscheiden die Leitung oder die jeweils zuständigen direkten Vorgesetzten.','wer entscheidet befoerderung vorgesetzte leitung',50,CURRENT_TIMESTAMP),
  ('sfq-san-1','staff-faq-cat-sanctions','Was ist eine Ermahnung?','Eine Ermahnung ist ein deutlicher Hinweis auf ein Fehlverhalten und soll eine Wiederholung verhindern.','ermahnung fehlverhalten warnung',10,CURRENT_TIMESTAMP),
  ('sfq-san-2','staff-faq-cat-sanctions','Wann wird ein Strike vergeben?','Ein Strike kann bei schweren oder wiederholten Verstößen gegen Teamregeln vergeben werden.','strike schwere wiederholte verstoesse teamregeln',20,CURRENT_TIMESTAMP),
  ('sfq-san-3','staff-faq-cat-sanctions','Wann verfällt ein Strike?','Ein Strike verfällt nach einem Monat, sofern keine abweichende Entscheidung mitgeteilt wurde.','strike verfall monat',30,CURRENT_TIMESTAMP),
  ('sfq-san-4','staff-faq-cat-sanctions','Kann gegen eine Sanktion Einspruch eingelegt werden?','Ja, wenn neue Informationen oder Beweise fristgerecht eingereicht werden.','sanktion einspruch beweise frist',40,CURRENT_TIMESTAMP),
  ('sfq-san-5','staff-faq-cat-sanctions','Wer entscheidet über interne Sanktionen?','Zuständige Vorgesetzte oder die Leitung entscheiden auf Grundlage der Regeln und Beweise.','interne sanktionen vorgesetzte leitung',50,CURRENT_TIMESTAMP),
  ('sfq-act-1','staff-faq-cat-activity','Wie viele Wochenstunden müssen erfüllt werden?','Es gelten die Vorgaben der Teamregeln und die in Melonly ausgewiesenen Anforderungen.','wochenstunden teamregeln melonly',10,CURRENT_TIMESTAMP),
  ('sfq-act-2','staff-faq-cat-activity','Was passiert bei fehlender Aktivitätszeit?','Fehlende Zeit kann zu einem Gespräch, einer Ermahnung oder weiteren Maßnahmen führen.','fehlende aktivitaetszeit gespraech ermahnung',20,CURRENT_TIMESTAMP),
  ('sfq-act-3','staff-faq-cat-activity','Wie melde ich mich abwesend?','Abwesenheiten müssen rechtzeitig über Melonly eingereicht werden.','abwesend abwesenheit melonly',30,CURRENT_TIMESTAMP),
  ('sfq-act-4','staff-faq-cat-activity','Ist eine Abwesenheit automatisch genehmigt?','Nein. Die zuständigen Vorgesetzten prüfen und entscheiden über die Abwesenheit.','abwesenheit genehmigung vorgesetzte',40,CURRENT_TIMESTAMP),
  ('sfq-mod-1','staff-faq-cat-moderation','Wann muss ich in eine Situation eingreifen?','Greife ein, wenn ein Regelverstoß vorliegt oder eine Situation Unterstützung durch das Team benötigt.','eingreifen regelverstoss team support',10,CURRENT_TIMESTAMP),
  ('sfq-mod-2','staff-faq-cat-moderation','Wann darf eine Situation aufgelöst werden?','Eine Auflösung erfolgt nur nach Maßgabe des Strafenkatalogs und der Teamregeln.','situation aufloesen strafenkatalog teamregeln',20,CURRENT_TIMESTAMP),
  ('sfq-mod-3','staff-faq-cat-moderation','Darf ich in laufendes Roleplay eingreifen?','Nur wenn es erforderlich ist oder ein Regelverstoß den Serverbetrieb beziehungsweise das Roleplay beeinträchtigt.','laufendes roleplay eingreifen regelverstoss',30,CURRENT_TIMESTAMP),
  ('sfq-mod-4','staff-faq-cat-moderation','Was mache ich bei einer unklaren Situation?','Hole einen höheren Rang oder zuständigen Vorgesetzten hinzu und triff keine übereilte Entscheidung.','unklare situation hoeherer rang vorgesetzter',40,CURRENT_TIMESTAMP),
  ('sfq-mod-5','staff-faq-cat-moderation','Darf nach persönlicher Meinung sanktioniert werden?','Nein. Entscheidungen müssen auf Regeln, Beweisen und der konkreten Situation beruhen.','persoenliche meinung sanktion beweise regeln',50,CURRENT_TIMESTAMP),
  ('sfq-dis-1','staff-faq-cat-discord','Werden gebannte Spieler direkt vom Discord entfernt?','Nicht zwingend. In der Regel kennzeichnet die Rolle „Gebannt“ betroffene Nutzer und schränkt ihre Rechte ein; Ausnahmen sind möglich.','discord gebannt rolle rechte entfernen',10,CURRENT_TIMESTAMP),
  ('sfq-dis-2','staff-faq-cat-discord','Wer darf eine Entbannung durchführen?','Nur Leitung oder Management mit vorheriger schriftlicher Erlaubnis.','entbannung unban leitung management schriftlich',20,CURRENT_TIMESTAMP),
  ('sfq-dis-3','staff-faq-cat-discord','Wann ist ein Discord-Bann gerechtfertigt?','Bei Verstößen gegen Discord-Regeln, schweren Community-Verstößen oder CMA kann ein Discord-Bann ausgesprochen werden.','discord bann regeln community cma',30,CURRENT_TIMESTAMP),
  ('sfq-tic-1','staff-faq-cat-tickets','Wer bearbeitet Beschwerden über Teammitglieder?','Beschwerden werden an die direkten Vorgesetzten des betroffenen Teammitglieds weitergegeben.','beschwerden teammitglieder vorgesetzte',10,CURRENT_TIMESTAMP),
  ('sfq-tic-2','staff-faq-cat-tickets','Was mache ich, wenn ich selbst beteiligt bin?','Gib die Bearbeitung an eine neutrale Person ab und greife der Entscheidung nicht vor.','selbst beteiligt neutral interessenkonflikt',20,CURRENT_TIMESTAMP),
  ('sfq-tic-3','staff-faq-cat-tickets','Wann darf ein Ticket geschlossen werden?','Ein Ticket wird erst nach angemessener Bearbeitung geschlossen. Ohne Rückmeldung der anfragenden Person kann es nach 48 Stunden beendet werden.','ticket schliessen bearbeitung 48 stunden',30,CURRENT_TIMESTAMP),
  ('sfq-tic-4','staff-faq-cat-tickets','Darf ohne ausreichende Beweise sanktioniert werden?','Nein. Ohne ausreichende Beweise wird keine Maßnahme verhängt.','beweise sanktion massnahme',40,CURRENT_TIMESTAMP),
  ('sfq-gen-1','staff-faq-cat-general','Was gilt bei einer Anweisung, die einer Regel widerspricht?','Die schriftlichen Regeln haben Vorrang. Informiere die zuständige Leitung über den Widerspruch.','anweisung widerspricht regel vorrang',10,CURRENT_TIMESTAMP),
  ('sfq-gen-2','staff-faq-cat-general','Wer darf Ausnahmen genehmigen?','Ausnahmen benötigen eine ausdrückliche Freigabe der Leitung im dafür vorgesehenen Kanal.','ausnahme genehmigung leitung kanal',20,CURRENT_TIMESTAMP),
  ('sfq-gen-3','staff-faq-cat-general','Was gilt bei einer Regelungslücke?','Handle nach gesundem Menschenverstand und informiere anschließend einen Vorgesetzten.','regelungsluecke menschenverstand vorgesetzter',30,CURRENT_TIMESTAMP),
  ('sfq-gen-4','staff-faq-cat-general','Dürfen Teamrechte privat genutzt werden?','Nein. Teamrechte dürfen ausschließlich für dienstliche Aufgaben eingesetzt werden.','teamrechte privat dienstlich',40,CURRENT_TIMESTAMP),
  ('sfq-gen-5','staff-faq-cat-general','Wie gehe ich mit einem Interessenkonflikt um?','übergib die Situation an ein anderes, neutrales Teammitglied.','interessenkonflikt neutral teammitglied',50,CURRENT_TIMESTAMP),
  ('sfq-gen-6','staff-faq-cat-general','Wann muss eine höhere Instanz hinzugezogen werden?','Wenn die Situation die eigene Zuständigkeit überschreitet, Unsicherheit besteht oder eine beteiligte Person einen Vorgesetzten verlangt.','hoeherer rang admin zustaendigkeit unsicher',60,CURRENT_TIMESTAMP),
  ('sfq-gen-7','staff-faq-cat-general','Welche Folgen haben wiederholte Staff-Verstöße?','Mögliche Folgen sind Ermahnungen, Strikes, eine Herabstufung oder die Entlassung aus dem Team.','wiederholte staff verstoesse strike downgrade entlassung',70,CURRENT_TIMESTAMP),
  ('sfq-gen-8','staff-faq-cat-general','Schützt Unwissenheit vor Konsequenzen?','Nein. Jedes Teammitglied ist dafür verantwortlich, die geltenden Regeln und Vorgaben zu kennen.','unwissenheit konsequenzen regeln',80,CURRENT_TIMESTAMP),
  ('sfq-gen-9','staff-faq-cat-general','Wie gehe ich mit widersprüchlichen Aussagen um?','Bleibe neutral, prüfe die Beweislage und vermeide eine vorschnelle Entscheidung.','widerspruechliche aussagen neutral beweise',90,CURRENT_TIMESTAMP),
  ('sfq-gen-10','staff-faq-cat-general','Wer entscheidet bei abschließenden Streitfällen?','Die abschließende Entscheidung trifft die Leitung beziehungsweise das Management.','abschliessende streitfaelle leitung management',100,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

UPDATE "FaqItem" SET "category" = 'Einstieg' WHERE "id" IN ('faq-serverzugang', 'faq-konten');
UPDATE "FaqItem" SET "category" = 'Support' WHERE "id" = 'faq-support';
UPDATE "FaqItem" SET "category" = 'Regelwerk' WHERE "id" = 'faq-regeln';

INSERT INTO "FaqItem" ("id", "category", "question", "answer", "sortOrder", "updatedAt") VALUES
  ('faq-was-ist-drp','Einstieg','Was ist DRP?','DRP ist eine deutschsprachige Roleplay-Community für Emergency Response: Liberty County mit klaren Regeln, Fraktionen und organisiertem Support.',5,CURRENT_TIMESTAMP),
  ('faq-beitritt','Einstieg','Was benötige ich für den Serverbeitritt?','Du benötigst ein Discord- und ein Roblox-Konto. Verknüpfe beide Konten im Portal, lies das Regelwerk und nutze anschließend den Roblox-Beitrittslink.',15,CURRENT_TIMESTAMP),
  ('faq-konto-aktualisieren','Konto','Wie aktualisiere oder wechsle ich mein Discord- oder Roblox-Konto?','Unter Dashboard > Profil kannst du vorhandene Profildaten erneut abrufen oder nach einer Bestätigung ein anderes Konto verbinden.',32,CURRENT_TIMESTAMP),
  ('faq-regelbestaetigung','Regelwerk','Warum muss ich Regeln erneut bestätigen?','Wird eine verÖffentlichte Regel in einer neuen Version verÖffentlicht, ist eine erneute Bestätigung notwendig.',42,CURRENT_TIMESTAMP),
  ('faq-ticket-kategorie','Support','Welche Ticketkategorie soll ich verwenden?','Nutze „Technischer Support“ bei Problemen mit Website, Login oder Serverzugang. Für alle anderen Anliegen wählst du „Kontaktaufnahme“.',50,CURRENT_TIMESTAMP),
  ('faq-ticket-archiv','Support','Wie archiviere ich ein Ticket?','Gelöste oder geschlossene Tickets kannst du in deinem Dashboard archivieren, wiederherstellen oder aus deiner persönlichen Ansicht entfernen.',55,CURRENT_TIMESTAMP),
  ('faq-status','Server','Wo sehe ich, ob Dienste funktionieren?','Die Öffentliche Statusseite zeigt den Zustand des ER:LC-Servers sowie verfügbare Discord-, Roblox- und manuelle Statusmeldungen.',60,CURRENT_TIMESTAMP),
  ('faq-rollen','Konto','Wie erhalte ich meine Website-Rollen?','Website-Rollen können vom Team vergeben oder über verknüpfte Discord-Rollen synchronisiert werden.',65,CURRENT_TIMESTAMP),
  ('faq-login-problem','Technik','Was kann ich bei Loginproblemen tun?','Prüfe, ob Cookies erlaubt sind, verwende die korrekte Netlify-Adresse und versuche die Anmeldung erneut. Besteht das Problem weiter, erstelle ein Support-Ticket.',70,CURRENT_TIMESTAMP),
  ('faq-datenschutz','Datenschutz','Welche Daten speichert DRP?','Details zu Kontoverknüpfungen, Tickets, Rollen, Aufbewahrungsfristen und deinen Rechten findest du in der Datenschutzerklärung.',80,CURRENT_TIMESTAMP),
  ('faq-datenloeschung','Datenschutz','Wie kann ich Auskunft oder Löschung verlangen?','Nutze die im Impressum oder in der Datenschutzerklärung angegebene Kontaktadresse und beschreibe dein Anliegen eindeutig.',90,CURRENT_TIMESTAMP),
  ('faq-kontakt','Support','Wie erreiche ich DRP außerhalb eines Tickets?','Nutze die im Impressum angegebene Kontaktmöglichkeit oder den offiziellen Discord-Server.',100,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ErlcServerState" ("id", "updatedAt") VALUES ('primary', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
