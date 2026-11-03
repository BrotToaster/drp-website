import { ErrorScreen } from "@/components/error-screen";

export const metadata = { title: "Seite nicht gefunden", description: "Diese Seite ist nicht verfügbar. Zurück zur DRP-Startseite.", robots: { index: false } };

export default function NotFound() {
  return <ErrorScreen code="404" />;
}
