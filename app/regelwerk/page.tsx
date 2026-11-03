import { publicMetadata } from "@/lib/metadata";
import { RuleExplorer } from "@/components/rule-explorer";
import { getPublishedRules } from "@/lib/data";

export const metadata = publicMetadata("Regelwerk", "Die aktuellen Regeln für Roleplay, Discord, Events und Fraktionen bei Deutschland Roleplay.", "/regelwerk");
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await getPublishedRules();
  return (
    <div className="rules-page container-shell">
      <header className="rules-intro">
        <h1>Regelwerk.</h1>
        <p>Finde die Regel, die du gerade brauchst. Wähle einen Bereich oder suche direkt nach einem Begriff.</p>
        <div className="rules-overview"><span>{rules.length} veröffentlichte Regeln</span><span>{new Set(rules.map(rule => rule.category)).size} Bereiche</span></div>
      </header>
      <RuleExplorer rules={rules} />
      <p className="rules-footnote">Unsere Regeln schaffen den Rahmen für glaubwürdige Geschichten. Mit der Teilnahme am Server erkennst du die aktuelle Fassung an.</p>
    </div>
  );
}
