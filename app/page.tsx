import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { ArrowLink, SectionHeading } from "@/components/ui";
import { getPublishedNews, getPublishedRules } from "@/lib/data";
import { getPublicServerStatus } from "@/lib/erlc";
import { formatDate, siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

const departments = [
  { code: "LCSO", name: "Sheriff's Office", copy: "Schütze Liberty County und sorge mit deinem Team für Sicherheit." },
  { code: "RCPD", name: "River City Police", copy: "Stadtpolizei mit klaren Strukturen und anspruchsvollen Einsätzen." },
  { code: "LCFD", name: "Fire & Rescue", copy: "Rette Leben, bekämpfe Brände und koordiniere komplexe Notfälle." },
  { code: "DOT", name: "Department of Transportation", copy: "Sichere Straßen, berge Fahrzeuge und halte den Verkehr am Laufen." },
];

export default async function HomePage() {
  const [status, news, rules] = await Promise.all([
    getPublicServerStatus(),
    getPublishedNews(),
    getPublishedRules(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="container-shell grid min-h-[760px] items-center gap-14 py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-in relative z-10">
            <StatusPill />
            <h1 className="display-title">
              Dein Einsatz.<br />
              <em>Deine Geschichte.</em>
            </h1>
            <p className="body-large max-w-xl">
              Erlebe durchdachtes deutsches Roleplay in Liberty County – mit klaren Regeln,
              starken Fraktionen und einer Community, die Qualität ernst nimmt.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer" className="button button-primary">
                Community beitreten <span aria-hidden="true">↗</span>
              </a>
              <Link href="/server" className="button button-secondary">
                Server entdecken
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-xs text-[#858b90]">
              <span><strong className="mr-2 text-white">24/7</strong> Community-Support</span>
              <span><strong className="mr-2 text-white">4</strong> Hauptfraktionen</span>
              <span><strong className="mr-2 text-white">100%</strong> Fair Play</span>
            </div>
          </div>

          <div className="animate-in relative mx-auto w-full max-w-[480px]" style={{ animationDelay: "120ms" }}>
            <div className="absolute -inset-12 rounded-full bg-[#d6aa4c]/[0.06] blur-3xl" />
            <div className="surface relative overflow-hidden p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777d81]">Live aus Liberty County</p>
                  <p className="mt-1.5 text-sm font-semibold">{status.name}</p>
                </div>
                <span className="badge badge-gold">{status.source === "demo" ? "Demo Live" : "Live"}</span>
              </div>
              <div className="relative h-[310px] overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0b0e11]">
                <svg viewBox="0 0 420 310" className="absolute inset-0 h-full w-full opacity-60" aria-hidden="true">
                  <path d="M-30 82C72 35 116 96 198 77s122-68 264-18" fill="none" stroke="#31383d" strokeWidth="18" />
                  <path d="M-20 235C94 219 113 151 207 164s127 101 257 73" fill="none" stroke="#252b30" strokeWidth="13" />
                  <path d="M80-20c5 100 89 135 68 223s11 101 29 140" fill="none" stroke="#2c3338" strokeWidth="9" />
                  <path d="M326-30c-31 104-16 162-74 212s-67 103-56 153" fill="none" stroke="#242a2f" strokeWidth="7" />
                  <g fill="none" stroke="#d6aa4c" strokeOpacity=".38">
                    <circle cx="148" cy="164" r="54" />
                    <circle cx="148" cy="164" r="83" strokeDasharray="3 8" />
                  </g>
                </svg>
                <div className="absolute left-[31%] top-[47%] grid h-9 w-9 place-items-center rounded-full border border-[#efc76e]/40 bg-[#d6aa4c]/20 shadow-[0_0_30px_rgba(214,170,76,.25)]">
                  <span className="h-2 w-2 rounded-full bg-[#efc76e]" />
                </div>
                <div className="absolute right-[19%] top-[22%] h-2.5 w-2.5 rounded-full bg-[#57c98c] shadow-[0_0_16px_rgba(87,201,140,.7)]" />
                <div className="absolute bottom-[20%] left-[18%] h-2.5 w-2.5 rounded-full bg-[#769fd4] shadow-[0_0_16px_rgba(118,159,212,.7)]" />
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/[0.07] bg-[#0a0c0e]/90 p-3 backdrop-blur">
                    <p className="text-[9px] uppercase tracking-wider text-[#777d81]">Spieler</p>
                    <p className="mt-1 text-lg font-semibold">{status.players ?? "–"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-[#0a0c0e]/90 p-3 backdrop-blur">
                    <p className="text-[9px] uppercase tracking-wider text-[#777d81]">Slots</p>
                    <p className="mt-1 text-lg font-semibold">{status.maxPlayers ?? "–"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-[#0a0c0e]/90 p-3 backdrop-blur">
                    <p className="text-[9px] uppercase tracking-wider text-[#777d81]">Queue</p>
                    <p className="mt-1 text-lg font-semibold">{status.queue ?? "–"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <SectionHeading
            eyebrow="Deine Rolle"
            title="Wo beginnt deine Geschichte?"
            copy="Wähle deinen Weg, entwickle deinen Charakter und werde Teil eines lebendigen Liberty County."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {departments.map((department, index) => (
              <article key={department.code} className="surface surface-interactive group p-7 md:p-8">
                <div className="flex items-start justify-between">
                  <span className="badge badge-gold">{department.code}</span>
                  <span className="text-xs text-[#62686c]">0{index + 1}</span>
                </div>
                <h3 className="mt-9 text-2xl font-semibold tracking-[-0.03em]">{department.name}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-[#90969a]">{department.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.015] section-space">
        <div className="container-shell grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <SectionHeading
            eyebrow="Klare Standards"
            title="Gutes Roleplay beginnt mit Fairness."
            copy="Unser Regelwerk schützt kreative Geschichten und sorgt dafür, dass jede Situation für alle Beteiligten nachvollziehbar bleibt."
          />
          <div className="grid gap-3">
            {rules.slice(0, 3).map((rule, index) => (
              <Link key={rule.id} href={"/regelwerk#" + rule.slug} className="surface surface-interactive flex items-center gap-5 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.04] text-xs font-bold text-[#efc76e]">
                  0{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#777d81]">{rule.category}</p>
                  <p className="mt-1 truncate font-semibold">{rule.title}</p>
                </div>
                <span className="ml-auto text-[#656b6f]">→</span>
              </Link>
            ))}
            <div className="mt-4"><ArrowLink href="/regelwerk">Vollständiges Regelwerk lesen</ArrowLink></div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Neuigkeiten" title="Aus der Community." />
            <ArrowLink href="/news">Alle Neuigkeiten</ArrowLink>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {news.slice(0, 3).map((post, index) => (
              <Link key={post.id} href={"/news/" + post.slug} className="surface surface-interactive overflow-hidden">
                <div className={"h-40 border-b border-white/[0.07] p-5 " + (index === 0 ? "bg-[#d6aa4c]/10" : "bg-white/[0.02]")}>
                  <span className="badge badge-gold">{post.coverLabel || "News"}</span>
                  <div className="mt-14 text-[10px] font-bold uppercase tracking-[0.16em] text-[#737a7e]">DRP Journal</div>
                </div>
                <div className="p-6">
                  <time className="text-xs text-[#73797d]">{formatDate(post.publishedAt)}</time>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{post.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#90969a]">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-shell">
          <div className="surface relative overflow-hidden px-6 py-16 text-center md:px-16 md:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(214,170,76,.18),transparent_50%)]" />
            <div className="relative mx-auto max-w-2xl">
              <span className="eyebrow">Bereit für Liberty County?</span>
              <h2 className="section-title mt-5">Deine nächste Schicht beginnt jetzt.</h2>
              <p className="body-large mt-5">Komm auf unseren Discord, lies das Regelwerk und werde Teil von DRP.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href={siteConfig.discordUrl} target="_blank" rel="noreferrer" className="button button-primary">Discord beitreten</a>
                <Link href="/regelwerk" className="button button-secondary">Regelwerk lesen</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
