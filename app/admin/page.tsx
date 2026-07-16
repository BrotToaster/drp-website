import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { authorization } = await requirePermission("admin.access");
  const [roles, discordRoles, categories, settings] = await Promise.all([
    prisma.accessRole.count(),
    prisma.discordRole.count(),
    prisma.ticketCategory.count(),
    prisma.siteSetting.count(),
  ]);
  const cards = [
    ["Rollen & Rechte", roles, "/admin/rollen", "roles.manage"],
    ["Discord-Rollen", discordRoles, "/admin/discord", "discord.manage"],
    ["Ticketkategorien", categories, "/admin/tickets", "tickets.manage_categories"],
    ["Website-Einstellungen", settings, "/admin/website", "site.manage"],
  ] as const;

  return (
    <PortalShell authorization={authorization} title="Admin-Panel" description="Rollen, Integrationen und öffentliche Inhalte zentral konfigurieren." section="admin">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.filter((card) => hasPermission(authorization, card[3])).map(([label, count, href]) => (
          <Link key={href} href={href} className="surface surface-interactive p-6">
            <p className="text-xs uppercase tracking-[0.13em] text-[#777d81]">{label}</p>
            <p className="mt-4 text-3xl font-semibold">{count}</p>
            <span className="mt-5 inline-block text-xs font-bold text-[#efc76e]">Öffnen →</span>
          </Link>
        ))}
      </div>
    </PortalShell>
  );
}