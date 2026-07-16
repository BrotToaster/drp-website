import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { Logo } from "@/components/logo";
import { hasMinimumRole } from "@/lib/permissions";

const playerLinks = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/dashboard/profil", label: "Profil" },
  { href: "/dashboard/tickets", label: "Tickets" },
  { href: "/dashboard/bewerbung", label: "Bewerbung" },
];

const staffLinks = [
  { href: "/staff", label: "Staff-Übersicht" },
  { href: "/staff/tickets", label: "Ticketverwaltung" },
  { href: "/staff/bewerbungen", label: "Bewerbungen" },
  { href: "/staff/sanktionen", label: "Sanktionen" },
  { href: "/staff/inhalte", label: "Inhalte" },
  { href: "/staff/bot-daten", label: "Bot-Daten" },
  { href: "/staff/audit", label: "Audit-Log" },
];

export function PortalShell({ role, title, description, children, staff = false }: {
  role: Role; title: string; description: string; children: ReactNode; staff?: boolean;
}) {
  const links = staff ? staffLinks : playerLinks;
  return (
    <div className="container-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit lg:sticky lg:top-28">
          <div className="surface p-4">
            <div className="mb-5 flex items-center justify-between px-2 py-2"><Logo compact /><span className="badge badge-gold">{role}</span></div>
            <nav className="grid gap-1" aria-label={staff ? "Staff-Navigation" : "Dashboard-Navigation"}>
              {links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-sm font-semibold text-[#9da3a8] transition hover:bg-white/[0.045] hover:text-white">{link.label}</Link>)}
              {!staff && hasMinimumRole(role, "SUPPORTER") && <Link href="/staff" className="mt-2 rounded-xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/[0.07] px-3 py-3 text-sm font-semibold text-[#efc76e]">Staff-Panel</Link>}
              {staff && <Link href="/dashboard" className="mt-2 rounded-xl px-3 py-3 text-sm font-semibold text-[#9da3a8]">Zurück zum Dashboard</Link>}
            </nav>
          </div>
        </aside>
        <main className="min-w-0">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#efc76e]">{staff ? "DRP Administration" : "Mein DRP"}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8d9397]">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
