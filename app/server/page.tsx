import type { Metadata } from "next";
import { PageIntro, SectionHeading } from "@/components/ui";
import { getPublicServerStatus } from "@/lib/erlc";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Server" };
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
        copy="Struktur, faire Moderation und glaubwürdiges Roleplay bilden das Fundament unserer Community."
      />
      <section className="section-space">
        <div className="container-shell grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="surface p-7 md:p-10">
            <div className="flex items-center gap-3">
              <span className={"status-dot" + (status.online ? "" : " offline")} />
              <span className="text-sm font-semibold">{status.online ? "Server online" : "Status nicht verfügbar"}</span>
            </div>
            <p className="mt-10 text-sm text-[#858b90]">{status.name}</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="metric">{status.players ?? "–"}</span>
              <span className="mb-2 text-sm text-[#777d81]">/ {status.maxPlayers ?? "–"} Spieler</span>
            </div>
            <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-[#d6aa4c]"
                style={{
                  width:
                    status.players !== null && status.maxPlayers
                      ? Math.min(100, (status.players / status.maxPlayers) * 100) + "%"
                      : "0%",
                }}
              />
            </div>
            <p className="mt-3 text-xs text-[#686e72]">
              {status.source === "demo" ? "Lokale Demo-Daten" : "Live-Status · Aktualisierung alle 30 Sekunden"}
            </p>
          </div>
          <div className="surface p-7 md:p-10">
            <span className="eyebrow">Grundsätze</span>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">Qualität vor Quantität.</h2>
            <div className="mt-7 grid gap-5 text-sm leading-7 text-[#9da3a8]">
              <p><strong className="text-white">Respekt.</strong> Jede Person wird fair behandelt – unabhängig von Erfahrung oder Rolle.</p>
              <p><strong className="text-white">Immersion.</strong> Entscheidungen folgen der Situation, nicht dem eigenen Vorteil.</p>
              <p><strong className="text-white">Transparenz.</strong> Regeln und Staff-Entscheidungen sind nachvollziehbar dokumentiert.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y border-white/[0.07] bg-white/[0.015] section-space">
        <div className="container-shell">
          <SectionHeading eyebrow="Dein Einstieg" title="In vier Schritten im Einsatz." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.07] md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, copy]) => (
              <div key={number} className="bg-[#0f1215] p-7">
                <span className="text-xs font-bold text-[#efc76e]">{number}</span>
                <h3 className="mt-12 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#858b90]">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer" className="button button-primary">Discord öffnen</a>
            <a href={siteConfig.robloxUrl} target="_blank" rel="noreferrer" className="button button-secondary">ER:LC auf Roblox</a>
          </div>
        </div>
      </section>
    </>
  );
}
