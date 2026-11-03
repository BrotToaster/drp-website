import Link from "next/link";
import { ContentImage } from "@/components/content-image";
import { homeShareDescription, publicMetadata } from "@/lib/metadata";
export const metadata = publicMetadata("Deutschland Roleplay", homeShareDescription, "/");
import { CinematicMapCard } from "@/components/cinematic-map-card";
import { StatusPill } from "@/components/status-pill";
import { NewsCard } from "@/components/news-card";
import { RuleRotator } from "@/components/rule-rotator";
import { ArrowLink, SectionHeading } from "@/components/ui";
import { getPublishedNews, getPublishedRules } from "@/lib/data";
import { getPublicServerStatus } from "@/lib/erlc";
import { getOfficialErlcMapUrl } from "@/lib/erlc-map";
import { getHomepageSettings } from "@/lib/site-settings";
import { HomeMotion } from "@/components/home-motion";
import { SpotlightCard } from "@/components/spotlight-card";
import { InteractiveLink } from "@/components/interactive-link";
import { communityFactions } from "@/lib/community-assets";

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
    <div className="drp-home" data-drp-home>
      <HomeMotion />
      <section className="home-hero relative overflow-hidden border-b border-[var(--line)]">
        <div className="container-shell home-hero-layout">
          <div className="home-hero-copy">
            <h1 className="display-title">
              Dein Einsatz.<br />
              <em>Deine Geschichte.</em>
            </h1>
            <p className="body-large max-w-xl">
              Deutsches Roleplay in Liberty County. Berufe, Freizeit und gemeinsame
              Events – auf Discord findest du den Serverzugang und Hilfe im Spiel.
            </p>
            <div className="home-hero-actions">
              <InteractiveLink href={homepage.discordUrl} target="_blank" rel="noreferrer">Auf Discord beitreten</InteractiveLink>
              <Link href="/server" className="hero-secondary-link">
                Server und Voraussetzungen ansehen
              </Link>
            </div>
            <div className="home-hero-status"><StatusPill /></div>
            <div className="home-hero-facts">
              <span>Kostenloses Communityportal</span>
              <span>Regelwerk und Kontakt frei zugänglich</span>
            </div>
          </div>

          <div className="home-map-stage">
            <CinematicMapCard mapUrl={erlcMapUrl} status={status} />
          </div>
        </div>
      </section>

      <section id="einstieg" className="section-space border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <div className="container-shell">
          <SectionHeading title="In drei Schritten ins Roleplay." copy="Alles, was du vor deinem ersten Einsatz brauchst – klar und ohne Umwege." />
          <ol className="join-steps mt-12 grid gap-6 lg:grid-cols-3">
            {[
              ["01", "Community beitreten", "Komm auf den Discord, lies die Hinweise und lerne die Community kennen.", homepage.discordUrl],
              ["02", "Regelwerk verstehen", "Prüfe die aktuellen Regeln und bestätige sie später in deinem DRP-Konto.", "/regelwerk"],
              ["03", "Server betreten", "Sieh den Live-Status, verbinde dich mit ER:LC und starte deine Geschichte.", "/server"],
            ].map(([number, title, copy, href]) => <li key={number} className="join-step"><span className="display-font text-3xl font-bold text-[var(--accent-ink)]">{number}</span><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{copy}</p>{href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm font-bold text-[var(--accent-ink)]">Öffnen ↗</a> : <Link href={href} className="mt-6 inline-block text-sm font-bold text-[var(--accent-ink)]">Öffnen →</Link>}</li>)}
          </ol>
        </div>
      </section>

      <section className="home-departments section-space">
        <div className="container-shell">
          <SectionHeading
            title="Wo beginnt deine Geschichte?"
            copy="Wähle deinen Weg, entwickle deinen Charakter und werde Teil eines lebendigen Liberty County."
          />
          <ul className="community-factions" aria-label="Hauptfraktionen im Roleplay">
            {communityFactions.map(faction => <li key={faction.logo}><ContentImage src={faction.logo} alt={`Logo: ${faction.name}`} width={160} height={160} sizes="(max-width: 767px) 96px, 112px" /><span>{faction.name}</span></li>)}
          </ul>
          <div className="department-grid">
            {homepage.departments.map((department, index) => (
              <SpotlightCard key={department.code + index} className="department-card group overflow-hidden">
                {department.imageUrl && <div className="department-image"><ContentImage src={department.imageUrl} alt={`Einblick in ${department.name}`} fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover" /></div>}
                <h3>{department.name}</h3>
                <p>{department.copy}</p>
                {department.targetUrl && <a href={department.targetUrl} target="_blank" rel="noreferrer" className="text-[var(--accent-ink)]">{department.linkLabel || "Mehr erfahren"} ↗</a>}
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      <section className="community-gallery section-space">
        <div className="container-shell">
          <SectionHeading title="Einblicke aus unserer Community." copy="Gemeinsame Momente und Fahrzeuge aus dem DRP-Roleplay." />
          <div className="community-scenes">
            <figure><ContentImage src="/community/roleplay-gruppe.webp" alt="DRP-Spielcharaktere bei einem gemeinsamen Fototermin vor ihren Einsatzfahrzeugen" width={1440} height={647} sizes="(max-width: 767px) 100vw, 640px" /><figcaption>Ein gemeinsamer Fototermin im Roleplay.</figcaption></figure>
            <figure><ContentImage src="/community/fahrzeugaufstellung.webp" alt="Aufgereihte DRP-Einsatzfahrzeuge mit Spielcharakteren auf einem Parkplatz in Liberty County" width={1440} height={714} sizes="(max-width: 767px) 100vw, 640px" /><figcaption>Fahrzeugaufstellung in Liberty County.</figcaption></figure>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] section-space">
        <div className="container-shell grid gap-14 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <SectionHeading
            title="Gutes Roleplay beginnt mit Fairness."
            copy="Klare Regeln und ein respektvoller Umgang gehören bei DRP zusammen. Bei Fragen zum Spiel oder zur Community hilft dir unser Team auf Discord."
          />
          <div>
            <RuleRotator rules={rules.map(({ id, slug, category, title }) => ({ id, slug, category, title }))} />
            <div className="mt-4"><ArrowLink href="/regelwerk">Vollständiges Regelwerk lesen</ArrowLink></div>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="container-shell">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading title="Was neu bei DRP ist." />
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
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="section-title">Website, Konto und Staff-Werkzeuge an einem Ort.</h2>
              <p className="body-large mt-5">Öffne dein DRP-Konto für Profil, Regelbestätigung und Website-Tickets. Operative Melonly-Aufgaben bleiben klar verlinkt.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/dashboard" className="button button-primary">DRP-System öffnen</Link>
                <a href={homepage.discordSupportUrl} target="_blank" rel="noreferrer" className="button button-secondary">Discord-Support</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
