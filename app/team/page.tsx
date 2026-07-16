import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";
import { getPublicTeam } from "@/lib/data";

export const metadata: Metadata = { title: "Team" };
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
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d6aa4c]/20 bg-[#d6aa4c]/10 text-xl font-bold text-[#efc76e]">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="mt-8 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#efc76e]">{member.department}</span>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{member.name}</h2>
              <p className="mt-1 text-sm text-[#9da3a8]">{member.title}</p>
              <p className="mt-5 text-sm leading-7 text-[#858b90]">{member.bio}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
