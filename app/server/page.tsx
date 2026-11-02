import { publicMetadata } from "@/lib/metadata";
import { PageIntro, SectionHeading } from "@/components/ui";
import { getPublicServerStatus } from "@/lib/erlc";
import { siteConfig } from "@/lib/site";
import { RelativeTime } from "@/components/relative-time";

export const metadata = publicMetadata("Server & Einstieg", "Serverstatus, Voraussetzungen und Zugang zum deutschen ER:LC-Roleplay bei DRP.", "/server");
export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const status = await getPublicServerStatus();
  const steps = [
    ["01", "Discord beitreten", "Verifiziere dich, lerne die Community kennen und erhalte alle wichtigen Updates."],
    ["02", "Regelwerk lesen", "Mache dich mit unseren Standards für faires und hochwertiges Roleplay vertraut."],
    ["03", "Profil verbinden", "Melde dich an und hinterlege deinen Roblox-Namen in deinem DRP-Profil."],
    ["04", "Geschichte starten", "Tritt dem Server bei, wähle deine Rolle und gestalte Liberty County mit."],
  ];
  return (
    <>
      <PageIntro
        eyebrow="DRP Private Server"
        title="Ein Server mit Haltung."
        copy="Deutschsprachiges Roleplay in Emergency Response: Liberty County – mit verschiedenen Berufen, Freizeit und gemeinsamen Events."
      />
      <section className="section-space">
        <div className="container-shell grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="surface p-7 md:p-10">
            <div className="flex items-center gap-3">
              <span className={"status-dot" + (status.online ? "" : " offline")} />
              <span className="text-sm font-semibold">{status.online ? "Server online" : "Status nicht verfügbar"}</span>
            </div>
            <p className="mt-10 text-sm text-[var(--muted)]">{status.name}</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="metric">{status.players ?? "–"}</span>
              <span className="mb-2 text-sm text-[var(--muted)]">/ {status.maxPlayers ?? "–"} Spieler</span>
            </div>
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{
                  width:
                    status.players !== null && status.maxPlayers
                      ? Math.min(100, (status.players / status.maxPlayers) * 100) + "%"
                      : "0%",
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {status.source === "demo" ? "Lokale Demo-Daten" : "Automatischer Abgleich im Fünf-Minuten-Rhythmus"} · <RelativeTime value={status.lastSuccessfulAt} />
            </p>
            {status.error && <p className="mt-2 text-xs text-[var(--danger-ink)]"><RelativeTime value={status.checkedAt} prefix="Letzter Versuch" /> · {status.error}</p>}
          </div>
          <div className="surface p-7 md:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">So spielen wir zusammen.</h2>
            <div className="mt-7 grid gap-5 text-sm leading-7 text-[var(--muted)]">
              <p><strong className="text-[var(--text)]">Respekt.</strong> Jede Person soll sich hier willkommen fühlen. Erfahrung oder Rolle ändern daran nichts.</p>
              <p><strong className="text-[var(--text)]">Regeln.</strong> Unser Team setzt das Regelwerk um und hilft dir bei Fragen zu einer Situation.</p>
              <p><strong className="text-[var(--text)]">Hilfe im Spiel.</strong> Bei Fragen oder Problemen erreichst du das Team über Discord.</p>
            </div>
            <a href="https://discord.com/servers/deutschland-roleplay-1434478281666728012" target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-11 items-center text-sm text-[var(--accent-ink)]">Communityprofil auf Discord ansehen ↗</a>
          </div>
        </div>
      </section>
      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] section-space">
        <div className="container-shell">
          <SectionHeading eyebrow="Dein Einstieg" title="In vier Schritten im Einsatz." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, copy]) => (
              <div key={number} className="bg-[var(--surface-soft)] p-7">
                <span className="text-xs font-bold text-[var(--accent-ink)]">{number}</span>
                <h3 className="mt-12 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3" data-intro="server">
            <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer" className="button button-primary">Discord öffnen</a>
            <a href={siteConfig.robloxUrl} target="_blank" rel="noreferrer" className="button button-secondary">ER:LC auf Roblox</a>
          </div>
        </div>
      </section>
    </>
  );
}
