import type { JSONContent } from "@tiptap/react";
import fixture from "@/data/rules.fixture.json";
import { paragraphContent, plainTextFromContent } from "@/lib/content";

export type MediaView = {
  id: string;
  url: string;
  kind: "IMAGE" | "AUDIO" | "VIDEO";
  name: string;
  caption: string | null;
};

export type RuleView = {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: JSONContent;
  searchText: string;
  order: number;
  version: number;
  updatedAt: Date;
  media: MediaView[];
};

export type NewsView = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: JSONContent;
  coverLabel: string | null;
  publishedAt: Date;
  editedAt: Date | null;
  thumbnailUrl: string | null;
  media: MediaView[];
};

export type TeamView = {
  id: string;
  name: string;
  title: string;
  department: string;
  bio: string | null;
  avatar: string | null;
};

export const demoRules: RuleView[] = fixture.rules.map((rule) => ({
  id: `rule-${rule.sourceKey}`,
  slug: rule.sourceKey,
  category: rule.category,
  title: rule.title,
  content: rule.content as JSONContent,
  searchText: `${rule.title} ${plainTextFromContent(rule.content as JSONContent)}`,
  order: rule.order,
  version: 1,
  updatedAt: new Date(fixture.importedAt + "T12:00:00Z"),
  media: [],
}));

export const demoNews: NewsView[] = [
  {
    id: "news-1",
    slug: "willkommen-bei-drp",
    title: "Willkommen bei DRP",
    excerpt: "Unser Serverportal bündelt Informationen, Support und Neuigkeiten.",
    content: paragraphContent(
      "Willkommen bei Deutschland Roleplay. Hier findest du künftig alle wichtigen Informationen und Neuigkeiten an einem Ort.",
    ),
    coverLabel: "Community",
    publishedAt: new Date("2026-07-12T18:00:00Z"),
    editedAt: null,
    thumbnailUrl: null,
    media: [],
  },
  {
    id: "news-2",
    slug: "portal-update",
    title: "Das neue Portal ist da",
    excerpt: "Schnellere Navigation, ein vollständiges Regelwerk und besserer Support.",
    content: paragraphContent(
      "Das Portal wurde technisch und gestalterisch überarbeitet. Tickets, Kontoverknüpfungen und das Regelwerk sind jetzt übersichtlich erreichbar.",
    ),
    coverLabel: "Update",
    publishedAt: new Date("2026-07-08T14:30:00Z"),
    editedAt: null,
    thumbnailUrl: null,
    media: [],
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