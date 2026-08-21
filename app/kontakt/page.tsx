import type { Metadata } from "next";
import Link from "next/link";
import { GuestTicketForm } from "@/components/guest-ticket-form";
import { PageIntro } from "@/components/ui";
import { getHomepageSettings } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Kontakt", description: "Kontaktaufnahme und technische Fragen an das DRP-Team." };

export default async function ContactPage() {
  const links = await getHomepageSettings();
  return <><PageIntro eyebrow="Kontakt" title="Der richtige Weg für dein Anliegen." copy="Website-Kontakt und technische Fragen hier, Community- und Spielsupport direkt auf Discord." />
    <section className="section-space"><div className="container-shell grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <GuestTicketForm />
      <aside className="grid h-fit gap-4"><div className="surface p-6"><span className="nav-code">DC</span><h2 className="mt-5 text-xl font-semibold">Spiel- und Community-Support</h2><p className="mt-3 text-sm leading-7 text-[#8d9397]">Reports, Appeals, Bewerbungen und allgemeiner Spielsupport bleiben in den dafür vorgesehenen Discord- und Melonly-Abläufen.</p><a className="button button-secondary mt-5" href={links.discordSupportUrl} target="_blank" rel="noreferrer">Discord-Support öffnen ↗</a></div>
      <div className="surface p-6"><span className="nav-code">OW</span><h2 className="mt-5 text-xl font-semibold">Vertrauliches Ownership-Ticket</h2><p className="mt-3 text-sm leading-7 text-[#8d9397]">Ownership-Anliegen sind nur nach Anmeldung möglich und ausschließlich für Administration und Ownership sichtbar.</p><Link className="button button-secondary mt-5" href="/dashboard/tickets?category=OWNERSHIP">Anmelden & erstellen</Link></div></aside>
    </div></section></>;
}
