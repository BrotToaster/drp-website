import Link from "next/link";
import { Logo } from "@/components/logo";
import { getHomepageSettings } from "@/lib/site-settings";
import { IntroReplayButton } from "@/components/first-visit-intro";

export async function Footer() {
  const homepage = await getHomepageSettings();
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface-soft)]">
      <div className="container-shell grid gap-12 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div><Logo /><p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted)]">Deutschland Roleplay ist eine Community für den deutschsprachigen Raum. Deine Nationalität spielt keine Rolle – wichtig ist die gemeinsame Verständigung auf Deutsch.</p></div>
        <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-ink)]">Entdecken</p><div className="grid gap-3 text-sm text-[var(--muted)]"><Link href="/server">Server</Link><Link href="/status">Status</Link><Link href="/kalender">Kalender</Link><Link href="/regelwerk">Regelwerk</Link><Link href="/team">Unser Team</Link><Link href="/faq">Häufige Fragen</Link></div></div>
        <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-ink)]">Community & Hilfe</p><div className="grid gap-3 text-sm text-[var(--muted)]"><a href={homepage.discordUrl} target="_blank" rel="noreferrer">Discord öffnen</a><a href={homepage.robloxUrl} target="_blank" rel="noreferrer">Auf Roblox beitreten</a><a href="https://www.tiktok.com/@deutschland.rp.erlc" target="_blank" rel="noopener noreferrer">DRP auf TikTok</a><Link href="/kontakt">Website-Kontakt</Link><Link href="/fehler">Technische Hilfe</Link><a href={homepage.discordSupportUrl} target="_blank" rel="noreferrer">Discord-Support</a><Link href="/datenschutz">Datenschutz</Link><Link href="/nutzungsbedingungen">Nutzungsregeln</Link></div></div>
      </div>
      <div className="border-t border-[var(--line)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]"><span>© {new Date().getFullYear()} DRP. Alle Rechte vorbehalten.</span><IntroReplayButton /><span>Nicht mit Roblox oder Police Roleplay Community verbunden.</span></div></div>
    </footer>
  );
}
