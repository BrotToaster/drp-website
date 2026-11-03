import Link from "next/link";
import { Logo } from "@/components/logo";
import { getHomepageSettings } from "@/lib/site-settings";
import { IntroReplayButton } from "@/components/first-visit-intro";

export async function Footer() {
  const homepage = await getHomepageSettings();
  const groups = [
    { title: "Roleplay", links: [["/server", "Server"], ["/#hauptfraktionen", "Hauptfraktionen"], ["/regelwerk", "Regelwerk"], ["/news", "Neuigkeiten"], ["/kalender", "Kalender"]] },
    { title: "Community", links: [["/team", "Unser Team"], [homepage.discordUrl, "Discord öffnen"], [homepage.robloxUrl, "Auf Roblox beitreten"], ["https://www.tiktok.com/@deutschland.rp.erlc", "DRP auf TikTok"]] },
    { title: "Hilfe & Kontakt", links: [["/faq", "Häufige Fragen"], ["/status", "Status"], ["/kontakt", "Website-Kontakt"], ["/fehler", "Technische Hilfe"], [homepage.discordSupportUrl, "Discord-Support"]] },
    { title: "Rechtliches", links: [["/datenschutz", "Datenschutz"], ["/nutzungsbedingungen", "Nutzungsregeln"]] },
  ];
  return (
    <footer className="site-footer border-t border-[var(--line)] bg-[var(--surface-soft)]">
      <div className="container-shell site-footer-main">
        <div><Logo /><p className="mt-5 max-w-sm text-sm leading-7 text-[var(--muted)]">Deutschland Roleplay ist eine Community für den deutschsprachigen Raum. Deine Nationalität spielt keine Rolle – wichtig ist die gemeinsame Verständigung auf Deutsch.</p></div>
        <div className="footer-link-groups">{groups.map(group => <nav key={group.title} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map(([href, label]) => <li key={label}>{href.startsWith("https://") ? <a href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <Link href={href}>{label}</Link>}</li>)}</ul></nav>)}</div>
      </div>
      <div className="border-t border-[var(--line)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]"><span>© {new Date().getFullYear()} DRP. Alle Rechte vorbehalten.</span><IntroReplayButton /><span>Nicht mit Roblox oder Police Roleplay Community verbunden.</span></div></div>
    </footer>
  );
}
