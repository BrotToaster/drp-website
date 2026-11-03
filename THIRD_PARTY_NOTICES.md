# Zusätzliche Gestaltungskomponenten

Die folgenden Quellen wurden für die DRP-Oberfläche verwendet. Die Website lädt ihren Code lokal aus dem eigenen Build; es werden keine Laufzeitskripte von den Anbieter-Websites eingebunden.

## GSAP

- Paket `gsap`, Version 3.15.0, GreenSock.
- Quelle und Nutzungshinweise: https://gsap.com/ und https://gsap.com/standard-license/.
- Einsatz: einmalige Liniensequenz am Kartenrahmen der Startseite mit pausierter Animation bei ausgeblendetem Browserdokument. Inhalte sind bereits vor der optionalen Animation sichtbar.

## Lenis

- Paket `lenis`, Version 1.3.27, darkroom.engineering, MIT.
- Quelle: https://github.com/darkroomengineering/lenis. Lizenztext: [licenses/lenis.txt](./licenses/lenis.txt).
- Einsatz: seitenweites sanftes Mausrad-Scrollen mit präzisem Zeiger und Hover-Unterstützung. Touch, Tastatur und verschachtelte Scrollbereiche bleiben nativ; die gemeinsame Ankersteuerung erhält bestehende Hash-Adressen. Dialoge und Drawer sperren das Scrollen des Dokuments. Die optionale Laufzeit lädt verzögert und läuft ohne permanenten Animationstakt im Stillstand. Bei reduzierter Bewegung, Datensparen oder weniger als vier gemeldeten Prozessorkernen wird sie nicht angefordert.

## React Bits

- Autor: David Haz. Projekt: https://github.com/DavidHDev/react-bits, Stand `963f4d21dca65326a470956c42b7b467804f3c14`.
- Vorlage: https://reactbits.dev/components/spotlight-card; `src/ts-default/Components/SpotlightCard/SpotlightCard.tsx`.
- `components/spotlight-card.tsx` ist eine vereinfachte Anpassung an die bestehende DRP-Karte. Keine dauerhafte Render-Schleife, kein zusätzliches Komponentenpaket, keine Änderung an Daten oder Berechtigungen.
- Lizenz: MIT mit Commons-Clause-Bedingung. Vollständiger Text: [licenses/react-bits.txt](./licenses/react-bits.txt). Die Komponente wird als Bestandteil dieser Website verwendet und nicht als eigenständiges Komponentenprodukt angeboten.

## 21st.dev / Magic UI

- Gefunden über 21st.dev: https://preview.21st.dev/%40dillionverma/components/interactive-hover-button.
- Originalautor: Magic UI / Dillion Verma. Projekt: https://github.com/magicuidesign/magicui, Stand `85f97fd27b053339af74ba9dd4ca428ee25989fb`.
- Vorlage: `apps/www/registry/magicui/interactive-hover-button.tsx`.
- `components/interactive-link.tsx` verwendet eine angepasste, rein mit CSS animierte Füllung als nativen Discord-Link. Der sichtbare Text wird nicht doppelt vorgelesen; ein zusätzliches Icon-Paket ist nicht erforderlich.
- MIT-Lizenz: [licenses/magic-ui.txt](./licenses/magic-ui.txt).
- 21st.dev dient hier als Komponentenverzeichnis und ist keine weitere Laufzeitabhängigkeit.

## Impeccable

- Gewünschter Gestaltungs-Skill: https://github.com/pbakaus/impeccable, Stand `8a0e198da34ebc5b936a9d5975fb7a3b1cf353b7`, Skillversion 4.6.0.
- Lokal als Entwicklungsskill installiert. Verwendet wurden Produkt- und Richtungsdefinition, Kontextprüfung, Animation, handwerkliche Qualität, Feinschliff und die abschließende Prüfung mit Dokumentation.
- Der Skill arbeitet während der Entwicklung. Er ist kein Skript der Website und wird nicht an Besucher ausgeliefert.

## Cloudflared (lokale Vorschau-Laufzeit)

- Cloudflare `cloudflared` 2026.10.1, Apache License 2.0. Kein Bestandteil des Browser-Bundles.
- Offizielle Quelle: https://github.com/cloudflare/cloudflared/releases/tag/2026.10.1.
- Windows-AMD64-Datei: `cloudflared-windows-amd64.exe`, SHA-256 `4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6`.
- `scripts/install-cloudflared.ps1` prüft den Download gegen diese Prüfsumme und legt ihn unter dem von Git ausgeschlossenen Ordner `runtime/cloudflared` ab.
- Lizenztext: https://github.com/cloudflare/cloudflared/blob/2026.10.1/LICENSE.
- Einsatz: temporäre HTTPS-Verbindung zum lokalen Passwort-Proxy. Anleitung und Grenzen: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.

Die bestehenden Lizenzen der übrigen Projektabhängigkeiten gelten unverändert weiter.

## Sicherheitsprüfung und Datenbankwerkzeuge

- Gitleaks 8.30.1 (MIT), ausschließlich als Prüfwerkzeug; kein Browserbestandteil. Offizielle Quelle: https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1. Heruntergeladene Binärdateien liegen nur im ignorierten Laufzeitordner; die CI prüft den SHA-256-Wert des festgelegten Linux-Archivs.
- Die aktualisierten Bibliotheksversionen, darunter Next.js 15.5.28, Tiptap 3.32.2, sharp 0.35.5 und Zod 4.6.7, sind in package-lock.json festgelegt. Ihre jeweiligen Paketlizenzen gelten weiter.
- node-postgres (pg) wird für explizite portable Migrationen und Vorschauinitialisierung verwendet. Die laufende Website verwendet weiterhin Prisma.

## Community-Aufnahmen und Fraktionslogos

Die fünf Fraktionslogos und zwei Spielaufnahmen unter `public/community` wurden vom Nutzer zur Einbindung bereitgestellt. Die Originale wurden proportional skaliert beziehungsweise komprimiert. Die jeweilige Herkunftsdatei ist in der benachbarten `.json`-Datei vermerkt. Sie werden lokal ausgeliefert; ein zusätzliches Bildernetzwerk wird dafür nicht eingebunden.
