import { communityFactions } from "./community-assets";

type Card = { code: string; title: string; description: string; visible: boolean; sortOrder: number };
type Legacy = { code: string; name: string; copy: string };
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function findCommunityFaction(code: string, title = "") {
  const candidates = [normalize(code), normalize(title)].filter(Boolean);
  return communityFactions.find(faction => [faction.code, faction.name, ...faction.aliases].some(alias => candidates.includes(normalize(alias))));
}

// Existing records and descriptions remain authoritative. No seed or migration
// is required to make the missing main-faction editors available.
export function groupHomepageCards<T extends Card>(cards: T[], legacy: Legacy[] = []) {
  const selected = new Set<T>();
  const factions = communityFactions.map((faction, index) => {
    const card = cards.find(item => findCommunityFaction(item.code, item.title)?.code === faction.code);
    if (card) selected.add(card);
    const previous = legacy.find(item => findCommunityFaction(item.code, item.name)?.code === faction.code);
    return {
      code: faction.code, logo: faction.logo, card,
      name: card?.title ?? previous?.name ?? faction.name,
      copy: card?.description ?? previous?.copy ?? faction.copy,
      visible: card?.visible ?? true,
      sortOrder: card?.sortOrder ?? (index + 1) * 10,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
  // Retain additional/custom records, including duplicate legacy records, so
  // that adopting the main-faction layout cannot silently discard old content.
  return { factions, extraCards: cards.filter(card => !selected.has(card)) };
}
