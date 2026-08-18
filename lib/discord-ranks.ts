export type ConfiguredDiscordRank = {
  id: string;
  section: string;
  shortName: string;
  sortOrder: number;
  discordRole: { id: string; discordRoleId: string; name: string };
  nextDiscordRole?: { id: string; discordRoleId: string; name: string } | null;
  outputLabel?: string | null;
  weeklyTargetMinutes: number;
};

export function jsonRoleIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function resolveDiscordRank(roleIds: readonly string[], ranks: readonly ConfiguredDiscordRank[]) {
  const matching = ranks
    .filter((rank) => roleIds.includes(rank.discordRole.discordRoleId))
    .sort((a, b) => b.sortOrder - a.sortOrder || a.shortName.localeCompare(b.shortName, "de"));
  return {
    rank: matching[0] || null,
    conflicts: matching.length > 1 ? matching.slice(1) : [],
  };
}
