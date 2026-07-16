import type { Metadata } from "next";
import { PageIntro } from "@/components/ui";
import { RuleExplorer } from "@/components/rule-explorer";
import { getPublishedRules } from "@/lib/data";

export const metadata: Metadata = { title: "Regelwerk" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await getPublishedRules();
  return (
    <>
      <PageIntro
        eyebrow="Regelwerk"
        title="Fair. Verständlich. Verbindlich."
        copy="Unsere Regeln schaffen den Rahmen für glaubwürdige Geschichten. Mit der Teilnahme am Server erkennst du die aktuelle Fassung an."
      >
        <span className="badge">Aktuelle Fassung · {rules.length} Regeln</span>
      </PageIntro>
      <section className="section-space">
        <div className="container-shell">
          <RuleExplorer rules={rules} />
        </div>
      </section>
    </>
  );
}
