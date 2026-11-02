import { hasSampleLegalDetails, legalDetailsComplete, type LegalSettings } from "@/lib/legal-settings";

export function LegalNotice({ legal }: { legal: LegalSettings }) {
  if (legal.privacyPublished && legalDetailsComplete(legal) && !hasSampleLegalDetails(legal)) return null;
  const sample = hasSampleLegalDetails(legal) || !legalDetailsComplete(legal);
  return <aside className="legal-preview" role="note"><strong>{sample ? "Lokale Vorschau – Musterangaben" : "Datenschutzhinweise – Entwurf"}</strong><p>{sample ? "Die Betreiberangaben sind noch unvollständig oder enthalten Beispieldaten. Vor einer öffentlichen Bereitstellung müssen sie ersetzt werden." : "Die verantwortliche Stelle ist angegeben. Die Datenschutzhinweise sind noch nicht abschließend geprüft."} Die Angaben müssen mit dem tatsächlichen Betrieb abgeglichen werden.</p></aside>;
}
