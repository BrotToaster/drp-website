import { PrismaClient } from "@prisma/client";

const datasourceUrl =
  process.env.NETLIFY_DB_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!datasourceUrl || !/^postgres(?:ql)?:\/\//i.test(datasourceUrl)) {
  throw new Error(
    "Zum Seeden wird eine PostgreSQL-URL in NETLIFY_DB_URL oder DATABASE_URL benötigt.",
  );
}

const prisma = new PrismaClient({ datasourceUrl });

const rules = [
  ["respekt-und-umgang", "Grundregeln", "Respekt und Umgang", "Behandle alle Spieler respektvoll. Beleidigungen, Diskriminierung, Provokationen und gezieltes Stören des Spielerlebnisses werden nicht toleriert.", 1, 2],
  ["roleplay-qualitaet", "Roleplay", "Roleplay-Qualität", "Handle nachvollziehbar, bleibe in deiner Rolle und gib jeder Situation Raum zur Entwicklung. Unrealistisches Verhalten und Fail-RP sind untersagt.", 2, 3],
  ["rdm-und-vdm", "Roleplay", "RDM und VDM", "Das grundlose Töten oder Anfahren anderer Spieler ist verboten. Gewalt benötigt immer einen plausiblen Roleplay-Hintergrund.", 3, 1],
  ["verfolgungen", "Einsatzregeln", "Verfolgungen", "Verfolgungen müssen fair und verhältnismäßig ausgespielt werden. Glitching und unrealistische Fahrmanöver sind verboten.", 4, 2],
  ["kommunikation", "Kommunikation", "Kommunikation", "Nutze die vorgesehenen Funk- und Sprachkanäle. Metagaming, Streamsniping und das Weitergeben interner Informationen sind untersagt.", 5, 1],
  ["staff-anweisungen", "Support", "Staff-Anweisungen", "Den sachlichen Anweisungen des Staff-Teams ist Folge zu leisten. Entscheidungen können anschließend ruhig über ein Ticket überprüft werden.", 6, 1],
];

const news = [
  ["willkommen-bei-drp", "Willkommen bei DRP", "Unser neues Serverportal ist da – klarer, schneller und näher an der Community.", "Mit dem neuen Portal bündeln wir Regelwerk, Bewerbungen, Support und alle wichtigen Serverinformationen an einem Ort.", "Community", "2026-07-12T18:00:00.000Z"],
  ["fraktionsbewerbungen", "Fraktionsbewerbungen geöffnet", "Sheriff, Police, Fire und DOT suchen engagierte Mitglieder.", "Die nächste Bewerbungsphase läuft. Lies die Anforderungen und sende deine Bewerbung direkt über dein Dashboard ein.", "Bewerbung", "2026-07-08T14:30:00.000Z"],
  ["regelwerk-update", "Regelwerk 2.3", "Klarere Einsatzregeln und neue Hinweise für Verfolgungssituationen.", "Das Regelwerk wurde sprachlich geschärft. Bestehende Grundsätze bleiben erhalten, einige Beispiele wurden ergänzt.", "Update", "2026-07-02T16:00:00.000Z"],
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { id: "demo-owner" },
    update: { role: "OWNER", registrationCompleted: true },
    create: {
      id: "demo-owner",
      name: "DRP Demo-Owner",
      email: "demo@drp.local",
      role: "OWNER",
      registrationCompleted: true,
    },
  });

  for (const [slug, category, title, content, order, version] of rules) {
    await prisma.rule.upsert({
      where: { slug },
      update: { category, title, content, order, version, published: true },
      create: { slug, category, title, content, order, version, published: true },
    });
  }

  for (const [slug, title, excerpt, content, coverLabel, publishedAt] of news) {
    await prisma.newsPost.upsert({
      where: { slug },
      update: { title, excerpt, content, coverLabel, published: true, publishedAt: new Date(publishedAt), authorId: owner.id },
      create: { slug, title, excerpt, content, coverLabel, published: true, publishedAt: new Date(publishedAt), authorId: owner.id },
    });
  }

  const team = [
    ["seed-owner", "Mori", "Projektleitung", "Management", "Verantwortlich für Vision, Community und die langfristige Entwicklung von DRP.", 1],
    ["seed-admin", "Alex", "Administration", "Serverleitung", "Koordiniert den Serverbetrieb und sorgt für klare interne Abläufe.", 2],
    ["seed-mod", "Jamie", "Moderation", "Community", "Erste Anlaufstelle für Support, Konfliktklärung und Community-Fragen.", 3],
  ];
  for (const [id, name, title, department, bio, displayOrder] of team) {
    const member = await prisma.user.upsert({
      where: { id },
      update: { name },
      create: {
        id,
        name,
        role: id === "seed-owner" ? "OWNER" : id === "seed-admin" ? "ADMIN" : "MODERATOR",
        registrationCompleted: true,
      },
    });
    await prisma.staffProfile.upsert({
      where: { userId: member.id },
      update: { title, department, bio, displayOrder, visible: true },
      create: { userId: member.id, title, department, bio, displayOrder, visible: true },
    });
  }

  await prisma.botRecord.upsert({
    where: { namespace_key: { namespace: "public", key: "discord" } },
    update: { data: { inviteCode: "drpg", members: 0, online: 0 } },
    create: {
      namespace: "public",
      key: "discord",
      data: { inviteCode: "drpg", members: 0, online: 0 },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
