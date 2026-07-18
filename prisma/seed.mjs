import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const datasourceUrl = process.env.NETLIFY_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!datasourceUrl || !/^postgres(?:ql)?:\/\//i.test(datasourceUrl)) {
  throw new Error("Zum Seeden wird eine PostgreSQL-URL in NETLIFY_DB_URL oder DATABASE_URL benötigt.");
}
const prisma = new PrismaClient({ datasourceUrl });
const fixture = JSON.parse(await readFile(new URL("../data/rules.fixture.json", import.meta.url), "utf8"));

const permissionDefinitions = [
  ["staff.access", "Staff-Panel öffnen", "Zugang"],
  ["admin.access", "Admin-Panel öffnen", "Zugang"],
  ["tickets.view", "Tickets anzeigen", "Tickets"],
  ["tickets.reply", "Auf Tickets antworten", "Tickets"],
  ["tickets.assign", "Tickets zuweisen", "Tickets"],
  ["tickets.status", "Ticketstatus ändern", "Tickets"],
  ["tickets.delete", "Geschlossene Tickets löschen", "Tickets"],
  ["users.view", "Nutzer anzeigen", "Nutzer"],
  ["users.roles.assign", "Nutzerrollen zuweisen", "Nutzer"],
  ["rules.view", "Regelverwaltung anzeigen", "Regelwerk"],
  ["rules.create", "Regeln erstellen", "Regelwerk"],
  ["rules.edit", "Regeln bearbeiten", "Regelwerk"],
  ["rules.delete", "Regeln löschen", "Regelwerk"],
  ["rules.publish", "Regeln veröffentlichen", "Regelwerk"],
  ["news.view", "Newsverwaltung anzeigen", "News"],
  ["news.create", "News erstellen", "News"],
  ["news.edit", "News bearbeiten", "News"],
  ["news.delete", "News löschen", "News"],
  ["news.publish", "News veröffentlichen", "News"],
  ["faq.view", "FAQ-Verwaltung anzeigen", "FAQ"],
  ["faq.manage", "FAQ verwalten", "FAQ"],
  ["audit.view", "Audit-Log anzeigen", "Kontrolle"],
  ["roles.manage", "Rollen und Rechte verwalten", "Administration"],
  ["discord.manage", "Discord-Zuordnungen verwalten", "Administration"],
  ["tickets.manage_categories", "Ticketkategorien verwalten", "Administration"],
  ["site.manage", "Website-Inhalte verwalten", "Administration"],
  ["team.manage", "Teamseite verwalten", "Administration"],
  ["status.manage", "Statusseite verwalten", "Administration"],
  ["legal.manage", "Rechtliche Inhalte verwalten", "Administration"],
  ["integrations.view", "Integrationen anzeigen", "Administration"],
];

const roleDefinitions = [
  ["PLAYER", "Player", "#7d858c", 0],
  ["SUPPORTER", "Supporter", "#57c98c", 20],
  ["MODERATOR", "Moderator", "#63a8ff", 40],
  ["ADMIN", "Admin", "#efc76e", 60],
  ["OWNER", "Owner", "#ef6b6b", 100],
];

const rolePermissionKeys = {
  PLAYER: [],
  SUPPORTER: ["staff.access", "tickets.view", "tickets.reply", "tickets.assign", "tickets.status", "users.view"],
  MODERATOR: ["staff.access", "tickets.view", "tickets.reply", "tickets.assign", "tickets.status", "users.view", "rules.view", "news.view", "audit.view"],
  ADMIN: permissionDefinitions.map(([key]) => key).filter((key) => key !== "roles.manage"),
  OWNER: permissionDefinitions.map(([key]) => key),
};

function paragraph(text) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

async function main() {
  const permissions = new Map();
  for (const [key, label, group] of permissionDefinitions) {
    const item = await prisma.permission.upsert({
      where: { key },
      update: { label, group },
      create: { key, label, group },
    });
    permissions.set(key, item);
  }

  const roles = new Map();
  for (const [key, name, color, priority] of roleDefinitions) {
    const role = await prisma.accessRole.upsert({
      where: { key },
      update: { name, color, priority, isSystem: true },
      create: { key, name, color, priority, isSystem: true },
    });
    roles.set(key, role);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: rolePermissionKeys[key].map((permissionKey) => ({
        roleId: role.id,
        permissionId: permissions.get(permissionKey).id,
      })),
    });
  }

  const categories = [];
  for (const data of [
    { key: "TECHNICAL", label: "Technischer Support", description: "Technische Probleme mit Website, Discord oder Serverzugang", sortOrder: 10 },
    { key: "CONTACT", label: "Kontaktaufnahme", description: "Allgemeine Kontaktaufnahme mit dem DRP-Team", sortOrder: 20 },
  ]) {
    categories.push(await prisma.ticketCategory.upsert({ where: { key: data.key }, update: data, create: data }));
  }
  for (const roleKey of ["SUPPORTER", "MODERATOR", "ADMIN", "OWNER"]) {
    for (const category of categories) {
      const role = roles.get(roleKey);
      await prisma.roleTicketCategoryAccess.upsert({
        where: { roleId_categoryId: { roleId: role.id, categoryId: category.id } },
        update: { canView: true, canReply: true, canAssign: true, canStatus: true, canDelete: ["ADMIN", "OWNER"].includes(roleKey) },
        create: { roleId: role.id, categoryId: category.id, canView: true, canReply: true, canAssign: true, canStatus: true, canDelete: ["ADMIN", "OWNER"].includes(roleKey) },
      });
    }
  }

  const owner = await prisma.user.upsert({
    where: { id: "demo-owner" },
    update: { registrationCompleted: true },
    create: { id: "demo-owner", name: "DRP Demo-Owner", registrationCompleted: true },
  });
  for (const roleKey of ["PLAYER", "OWNER"]) {
    const role = roles.get(roleKey);
    const sourceKey = roleKey === "OWNER" ? "owner-env" : "default-player";
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId_source_sourceKey: { userId: owner.id, roleId: role.id, source: "SYSTEM", sourceKey } },
      update: {},
      create: { userId: owner.id, roleId: role.id, source: "SYSTEM", sourceKey },
    });
  }

  await prisma.ruleAcceptance.deleteMany();
  for (const rule of fixture.rules) {
    const record = await prisma.rule.upsert({
      where: { sourceKey: rule.sourceKey },
      update: { slug: rule.sourceKey, sourceUrl: rule.sourceUrl, category: rule.category, title: rule.title, order: rule.order, version: 1, published: true },
      create: { slug: rule.sourceKey, sourceKey: rule.sourceKey, sourceUrl: rule.sourceUrl, category: rule.category, title: rule.title, order: rule.order, version: 1, published: true },
    });
    await prisma.ruleRevision.deleteMany({ where: { ruleId: record.id } });
    await prisma.ruleRevision.create({
      data: {
        ruleId: record.id,
        status: "PUBLISHED",
        content: rule.content,
        searchText: JSON.stringify(rule.content),
        publishedAt: new Date(),
      },
    });
  }

  const post = await prisma.newsPost.upsert({
    where: { slug: "willkommen-bei-drp" },
    update: { title: "Willkommen bei DRP", excerpt: "Das Portal bündelt Informationen, Support und Neuigkeiten.", published: true, publishedAt: new Date(), authorId: owner.id },
    create: { slug: "willkommen-bei-drp", title: "Willkommen bei DRP", excerpt: "Das Portal bündelt Informationen, Support und Neuigkeiten.", published: true, publishedAt: new Date(), authorId: owner.id },
  });
  if (!(await prisma.newsRevision.count({ where: { newsPostId: post.id } }))) {
    await prisma.newsRevision.create({
      data: {
        newsPostId: post.id,
        status: "PUBLISHED",
        content: paragraph("Willkommen bei Deutschland Roleplay. Alle wichtigen Informationen findest du jetzt an einem Ort."),
        searchText: "Willkommen bei Deutschland Roleplay",
        editorId: owner.id,
        publishedAt: new Date(),
      },
    });
  }

  const faqItems = [
    ["faq-serverzugang", "Wie komme ich auf den Server?", "Tritt unserem Discord bei, verbinde Discord und Roblox und bestätige anschließend das aktuelle Regelwerk im Dashboard.", 10],
    ["faq-support", "Wie erreiche ich den Support?", "Erstelle im Dashboard ein Ticket als „Technischer Support“ oder „Kontaktaufnahme“. Dort siehst du jederzeit den Bearbeitungsstand.", 20],
    ["faq-konten", "Warum muss ich Discord und Roblox verbinden?", "Die Verknüpfung ordnet deine Community- und Spielidentität eindeutig zu, ohne dass DRP deine Passwörter erhält.", 30],
    ["faq-regeln", "Wo sehe ich Regeländerungen?", "Jede Regel zeigt ihre Version und letzte Bearbeitung. Nach einer neuen Veröffentlichung ist eine erneute Bestätigung erforderlich.", 40],
  ];
  for (const [id, question, answer, sortOrder] of faqItems) {
    await prisma.faqItem.upsert({
      where: { id },
      update: { question, answer, sortOrder },
      create: { id, question, answer, sortOrder },
    });
  }

  for (const service of [
    { id: "status-erlc", key: "erlc", name: "ER:LC Server", description: "Status und Spielerzahl des DRP Private Servers", source: "ERLC", sortOrder: 10 },
    { id: "status-discord", key: "discord", name: "Discord", description: "Offizieller Discord-Plattformstatus", source: "DISCORD", sortOrder: 20 },
    { id: "status-roblox", key: "roblox", name: "Roblox", description: "Offizieller Roblox-Plattformstatus", source: "ROBLOX", sortOrder: 30 },
  ]) {
    await prisma.statusService.upsert({ where: { key: service.key }, update: service, create: service });
  }

  await prisma.siteSetting.upsert({
    where: { key: "legal.settings" },
    update: {},
    create: { key: "legal.settings", value: { imprintEnabled: true, privacyPublished: false, operatorName: "", addressLine: "", postalCode: "", city: "", country: "Schweiz", contactEmail: "", donations: "NONE", lastReviewedAt: null, noAgeVerificationAcknowledged: true } },
  });
  await prisma.siteSetting.upsert({
    where: { key: "retention.settings" },
    update: {},
    create: { key: "retention.settings", value: { closedTicketDays: 365, auditLogDays: 730, discordSnapshotDays: 30 } },
  });

  await prisma.botRecord.upsert({
    where: { namespace_key: { namespace: "public", key: "discord" } },
    update: { data: { inviteCode: "drpg", members: 0, online: 0 } },
    create: { namespace: "public", key: "discord", data: { inviteCode: "drpg", members: 0, online: 0 } },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });