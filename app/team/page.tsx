import { publicMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/ui";
import { getPublicTeam } from "@/lib/data";
import { ContentImage } from "@/components/content-image";

export const metadata = publicMetadata("Team", "Das Team hinter Deutschland Roleplay und seine Aufgaben in der Community.", "/team");
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const team = await getPublicTeam();
  return (
    <>
      <PageIntro eyebrow="Unser Team" title="Menschen mit Verantwortung." copy="Unser Staff sorgt für faire Entscheidungen, zuverlässigen Support und einen stabilen Serverbetrieb." />
      <section className="section-space">
        <div className="container-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <article key={member.id} className="surface p-7">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-xl font-bold text-[var(--accent-ink)]">
                {member.avatar ? (
                  <ContentImage src={member.avatar} alt={`Profilbild von ${member.name}`} width={64} height={64} sizes="64px" className="h-full w-full object-cover" />
                ) : member.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="mt-8 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--accent-ink)]">{member.department}</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{member.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{member.title}</p>
              <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{member.bio}</p>
            </article>
          ))}
          {!team.length && <p className="surface p-8 text-sm text-[var(--muted)]">Aktuell sind keine Teamprofile veröffentlicht.</p>}
        </div>
      </section>
    </>
  );
}
