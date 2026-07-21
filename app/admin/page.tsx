import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { authorization } = await requirePermission("admin.access");
  const [roles, users, cards, state, discordSync, audit] = await Promise.all([
    prisma.accessRole.count(),
    prisma.user.count(),
    prisma.homepageRoleCard.count(),
    prisma.erlcServerState.findUnique({ where: { id: "primary" } }),
    prisma.discordMemberSnapshot.findFirst({ orderBy: { lastSyncedAt: "desc" } }),
    prisma.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const cardsList = [
    ["Nutzer & Rollen", users, "/admin/nutzerrollen", "users.roles.assign"],
    ["Rollen & Rechte", roles, "/admin/rollen", "roles.manage"],
    ["Startseitenkarten", cards, "/admin/website", "site.manage"],
    ["Staff-FAQ", "Pflegen", "/admin/staff-faq", "staff_faq.manage"],
  ] as const;
  const health = [
    ["ER:LC", state?.lastSuccessfulAt ? (state.errorMessage ? "Veraltet" : "Bereit") : "Nicht geprüft", state?.checkedAt],
    ["Discord-Synchronisierung", discordSync ? "Verbunden" : "Keine Daten", discordSync?.lastSyncedAt],
    ["Cloudinary", process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET ? "Konfiguriert" : "Unvollständig", null],
  ] as const;
  return (
    <PortalShell authorization={authorization} title="Administration" description="Zugriffe, Website-Inhalte und Systemzustände zentral steuern." section="admin">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cardsList.filter((card) => hasPermission(authorization, card[3])).map(([label, count, href]) => <Link key={href} href={href} className="surface surface-interactive p-5"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">{label}</p><p className="mt-3 text-2xl font-semibold">{count}</p><span className="mt-4 inline-block text-xs font-bold text-[#efc76e]">Öffnen →</span></Link>)}</div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="surface p-6"><h2 className="text-lg font-semibold">Systemzustand</h2><div className="mt-5 grid gap-3">{health.map(([label, value, date]) => <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] p-4"><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-[10px] text-[#777d81]">{date ? formatDateTime(date) : "Konfiguration"}</p></div><span className={"badge " + (value === "Bereit" || value === "Verbunden" || value === "Konfiguriert" ? "badge-gold" : "")}>{value}</span></div>)}</div></section>
        <section className="surface p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Letzte Änderungen</h2>{hasPermission(authorization, "audit.view") && <Link href="/staff/audit" className="text-xs font-bold text-[#efc76e]">Audit öffnen →</Link>}</div><div className="mt-5 grid gap-3">{audit.map((entry) => <div key={entry.id} className="border-b border-white/[0.07] pb-3 last:border-0"><p className="text-sm"><span className="font-semibold">{entry.actor?.name || "System"}</span> · {entry.action}</p><p className="mt-1 text-[10px] text-[#777d81]">{entry.entityType} · {formatDateTime(entry.createdAt)}</p></div>)}{!audit.length && <p className="text-sm text-[#777d81]">Noch keine Änderungen protokolliert.</p>}</div></section>
      </div>
    </PortalShell>
  );
}
