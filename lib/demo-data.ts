export type RuleView = {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  order: number;
  version: number;
};

export type NewsView = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverLabel: string | null;
  publishedAt: Date;
};

export type TeamView = {
  id: string;
  name: string;
  title: string;
  department: string;
  bio: string | null;
  avatar: string | null;
};

export const demoRules: RuleView[] = [
  {
    id: "rule-respect",
    slug: "respekt-und-umgang",
    category: "Grundregeln",
    title: "Respekt und Umgang",
    content:
      "Behandle alle Spieler respektvoll. Beleidigungen, Diskriminierung, Provokationen und gezieltes Stören des Spielerlebnisses werden nicht toleriert.",
    order: 1,
    version: 2,
  },
  {
    id: "rule-rp",
    slug: "roleplay-qualitaet",
    category: "Roleplay",
    title: "Roleplay-Qualität",
    content:
      "Handle nachvollziehbar, bleibe in deiner Rolle und gib jeder Situation Raum zur Entwicklung. Unrealistisches Verhalten und Fail-RP sind untersagt.",
    order: 2,
    version: 3,
  },
  {
    id: "rule-rdm",
    slug: "rdm-und-vdm",
    category: "Roleplay",
    title: "RDM und VDM",
    content:
      "Das grundlose Töten oder Anfahren anderer Spieler ist verboten. Gewalt benötigt immer einen plausiblen Roleplay-Hintergrund und eine erkennbare Eskalation.",
    order: 3,
    version: 1,
  },
  {
    id: "rule-chase",
    slug: "verfolgungen",
    category: "Einsatzregeln",
    title: "Verfolgungen",
    content:
      "Verfolgungen müssen fair und verhältnismäßig ausgespielt werden. Absichtliches Desynchronisieren, Glitching oder unrealistische Fahrmanöver sind verboten.",
    order: 4,
    version: 2,
  },
  {
    id: "rule-comms",
    slug: "kommunikation",
    category: "Kommunikation",
    title: "Kommunikation",
    content:
      "Nutze die vorgesehenen Funk- und Sprachkanäle. Metagaming, Streamsniping und das Weitergeben interner Informationen sind untersagt.",
    order: 5,
    version: 1,
  },
  {
    id: "rule-staff",
    slug: "staff-anweisungen",
    category: "Support",
    title: "Staff-Anweisungen",
    content:
      "Den sachlichen Anweisungen des Staff-Teams ist Folge zu leisten. Entscheidungen können anschließend ruhig über ein Ticket überprüft werden.",
    order: 6,
    version: 1,
  },
];

export const demoNews: NewsView[] = [
  {
    id: "news-1",
    slug: "willkommen-bei-drp",
    title: "Willkommen bei DRP",
    excerpt: "Unser neues Serverportal ist da – klarer, schneller und näher an der Community.",
    content:
      "Mit dem neuen Portal bündeln wir Regelwerk, Bewerbungen, Support und alle wichtigen Serverinformationen an einem Ort.",
    coverLabel: "Community",
    publishedAt: new Date("2026-07-12T18:00:00Z"),
  },
  {
    id: "news-2",
    slug: "fraktionsbewerbungen",
    title: "Fraktionsbewerbungen geöffnet",
    excerpt: "Sheriff, Police, Fire und DOT suchen engagierte Mitglieder.",
    content:
      "Die nächste Bewerbungsphase läuft. Lies die Anforderungen und sende deine Bewerbung direkt über dein Dashboard ein.",
    coverLabel: "Bewerbung",
    publishedAt: new Date("2026-07-08T14:30:00Z"),
  },
  {
    id: "news-3",
    slug: "regelwerk-update",
    title: "Regelwerk 2.3",
    excerpt: "Klarere Einsatzregeln und neue Hinweise für Verfolgungssituationen.",
    content:
      "Das Regelwerk wurde sprachlich geschärft. Bestehende Grundsätze bleiben erhalten, einige Beispiele wurden ergänzt.",
    coverLabel: "Update",
    publishedAt: new Date("2026-07-02T16:00:00Z"),
  },
];

export const demoTeam: TeamView[] = [
  {
    id: "team-1",
    name: "Mori",
    title: "Projektleitung",
    department: "Management",
    bio: "Verantwortlich für Vision, Community und die langfristige Entwicklung von DRP.",
    avatar: null,
  },
  {
    id: "team-2",
    name: "Alex",
    title: "Administration",
    department: "Serverleitung",
    bio: "Koordiniert den Serverbetrieb und sorgt für klare interne Abläufe.",
    avatar: null,
  },
  {
    id: "team-3",
    name: "Jamie",
    title: "Moderation",
    department: "Community",
    bio: "Erste Anlaufstelle für Support, Konfliktklärung und Community-Fragen.",
    avatar: null,
  },
];
