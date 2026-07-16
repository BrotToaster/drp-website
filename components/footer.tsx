import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07] bg-black/10">
      <div className="container-shell grid gap-12 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#858b90]">
            Strukturiertes ER:LC Roleplay mit starken Geschichten, fairen Regeln und einer
            Community, die gemeinsam wächst.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#efc76e]">
            Entdecken
          </p>
          <div className="grid gap-3 text-sm text-[#9da3a8]">
            <Link href="/server">Server</Link>
            <Link href="/regelwerk">Regelwerk</Link>
            <Link href="/team">Unser Team</Link>
            <Link href="/faq">Häufige Fragen</Link>
          </div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#efc76e]">
            Community
          </p>
          <div className="grid gap-3 text-sm text-[#9da3a8]">
            <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer">
              Discord öffnen
            </a>
            <a href={siteConfig.robloxUrl} target="_blank" rel="noreferrer">
              Auf Roblox beitreten
            </a>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5">
        <div className="container-shell flex flex-wrap justify-between gap-3 text-xs text-[#666c70]">
          <span>© {new Date().getFullYear()} DRP. Alle Rechte vorbehalten.</span>
          <span>Nicht mit Roblox oder Police Roleplay Community verbunden.</span>
        </div>
      </div>
    </footer>
  );
}
