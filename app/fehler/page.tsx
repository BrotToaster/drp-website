import Link from "next/link";
import { commonErrors } from "@/lib/common-errors";
export const metadata = { title: "Technische Hilfe", robots: { index: false, follow: false } };
export default function ErrorHelpIndex() {
  return <section className="container-shell section-space"><h1 className="page-title">Was bedeutet die Fehlermeldung?</h1><p className="body-large">Hier findest du Erklärungen und nächste Schritte zu den üblichen Meldungen.</p><ul className="error-help-list">{Object.entries(commonErrors).map(([code, item]) => <li key={code}><Link href={`/fehler/${code}`}><span>{code === "offline" ? "Offline" : code}</span><strong>{item.title}</strong></Link></li>)}</ul></section>;
}
