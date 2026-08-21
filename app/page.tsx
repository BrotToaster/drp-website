import Link from "next/link";
import { CinematicMapCard } from "@/components/cinematic-map-card";
import { StatusPill } from "@/components/status-pill";
import { NewsCard } from "@/components/news-card";
import { RuleRotator } from "@/components/rule-rotator";
import { ArrowLink, SectionHeading } from "@/components/ui";
import { getPublishedNews, getPublishedRules } from "@/lib/data";
import { getPublicServerStatus } from "@/lib/erlc";
import { getOfficialErlcMapUrl } from "@/lib/erlc-map";
import { getHomepageSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";


export default async function HomePage() {
  const [status, news, rules, homepage, erlcMapUrl] = await Promise.all([
    getPublicServerStatus(),
    getPublishedNews(),
    getPublishedRules(),
    getHomepageSettings(),
    getOfficialErlcMapUrl(),
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
              <a href={homepage.discordUrl} target="_blank" rel="noreferrer" className="button button-primary">
                Community beitreten <span aria-hidden="true">↗</span>
              </a>
              <Link href="/server" className="button button-secondary">
                Server entdecken
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-xs text-[#858b90]">
              <span><strong className="mr-2 text-white">24/7</strong> Community-Support</span>
              <span><strong className="mr-2 text-white">100%</strong> Fair Play</span>
            </div>
          </div>

          <div className="animate-in relative mx-auto w-full max-w-[480px]" style={{ animationDelay: "120ms" }}>
            <div className="absolute -inset-12 rounded-full bg-[#d6aa4c]/[0.06] blur-3xl" />
            <CinematicMapCard mapUrl={erlcMapUrl} status={status} />
          </div>
        </div>
      </section>

      <section className="section-space border-b border-white/[0.07] bg-white/[0.012]">
        <div className="container-shell">
          <SectionHeading eyebrow="Dein Einstieg" title="In drei Schritten ins Roleplay." copy="Alles, was du vor deinem ersten Einsatz brauchst – klar und ohne Umwege." />
          <ol className="mt-12 grid gap-4 lg:grid-cols-3">
            {[
              ["01", "Community beitreten", "Komm auf den Discord, lies die Hinweise und lerne die Community kennen.", homepage.discordUrl],
              ["02", "Regelwerk verstehen", "Prüfe die aktuellen Regeln und bestätige sie später in deinem DRP-Konto.", "/regelwerk"],
              ["03", "Server betreten", "Sieh den Live-Status, verbinde dich mit ER:LC und starte deine Geschichte.", "/server"],
            ].map(([number, title, copy, href]) => <li key={number} className="surface surface-interactive p-7"><span className="display-font text-3xl font-bold text-[#f2c14e]">{number}</span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-[#90969a]">{copy}</p>{href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm font-bold text-[#f2c14e]">Öffnen ↗</a> : <Link href={href} className="mt-6 inline-block text-sm font-bold text-[#f2c14e]">Öffnen →</Link>}</li>)}
          </ol>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <SectionHeading
            eyebrow="Deine Rolle"
            title="Wo beginnt deine Geschichte?"
            copy="Wähle deinen Weg, entwickle deinen Charakter und werde Teil eines lebendigen Liberty County."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {homepage.departments.map((department, index) => (
              <article key={department.code + index} className="surface surface-interactive group overflow-hidden">
                <div className="h-36 border-b border-white/[0.07] bg-[#0b0e11] bg-cover bg-center" style={department.imageUrl ? { backgroundImage: `linear-gradient(to top, rgba(9,11,13,.55), transparent), url("${department.imageUrl}")` } : undefined}>
                  {!department.imageUrl && <div className="grid h-full place-items-center text-4xl font-semibold text-[#d6aa4c]/25">{department.code.slice(0, 2)}</div>}
                </div>
                <div className="p-7">
                  <div className="flex items-start justify-between"><span className="badge badge-gold">{department.code}</span><span className="text-xs text-[#62686c]">{String(index + 1).padStart(2, "0")}</span></div>
                  <h3 className="mt-7 text-2xl font-semibold tracking-[-0.03em]">{department.name}</h3>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#90969a]">{department.copy}</p>
                  {department.targetUrl && <a href={department.targetUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm font-bold text-[#efc76e]">{department.linkLabel || "Mehr erfahren"} ↗</a>}
                </div>
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
          <div>
            <RuleRotator rules={rules} />
            <div className="mt-4"><ArrowLink href="/regelwerk">Vollständiges Regelwerk lesen</ArrowLink></div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Neuigkeiten" title="Was neu bei DRP ist." />
            <ArrowLink href="/news">Alle Neuigkeiten</ArrowLink>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {news.slice(0, 3).map((post) => <NewsCard key={post.id} post={post} />)}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-shell">
          <div className="drp-system-cta surface relative overflow-hidden px-6 py-16 md:px-16 md:py-20">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative ml-auto max-w-2xl text-center lg:text-left">
              <span className="eyebrow">DRP-System</span>
              <h2 className="section-title mt-5">Website, Konto und Staff-Werkzeuge an einem Ort.</h2>
              <p className="body-large mt-5">Öffne dein DRP-Konto für Profil, Regelbestätigung und Website-Tickets. Operative Melonly-Aufgaben bleiben klar verlinkt.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link href="/dashboard" className="button button-primary">DRP-System öffnen</Link>
                <a href={homepage.discordSupportUrl} target="_blank" rel="noreferrer" className="button button-secondary">Discord-Support</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
