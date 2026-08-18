export type WeeklyMentionMode = "PING" | "CODE";

export type WeeklyInsiderEntry = {
  kind: string;
  section: string;
  discordId?: string | null;
  displayName: string;
  fromLabel?: string | null;
  toLabel?: string | null;
  text?: string | null;
  sortOrder?: number;
  included?: boolean;
};

export type WeeklyInsiderSignature = {
  discordId: string;
  label: string;
  sortOrder?: number;
};

export function formatDiscordMention(discordId: string, mode: WeeklyMentionMode) {
  const mention = `<@${discordId}>`;
  return mode === "PING" ? mention : `\`${mention}\``;
}

function mention(entry: WeeklyInsiderEntry, mode: WeeklyMentionMode) {
  return entry.discordId ? formatDiscordMention(entry.discordId, mode) : entry.displayName;
}

export function formatWeeklyInsider(input: {
  mentionMode: WeeklyMentionMode;
  mostActiveDiscordId?: string | null;
  mostActiveDisplayName?: string | null;
  entries: WeeklyInsiderEntry[];
  signatures: WeeklyInsiderSignature[];
}) {
  const entries = input.entries.filter((entry) => entry.included !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const promotions = (section: string) => entries
    .filter((entry) => entry.kind === "UPRANK" && entry.section === section)
    .map((entry) => `> ${mention(entry, input.mentionMode)} \`${entry.fromLabel || "?"} -> ${entry.toLabel || "?"}\``);
  const loa = entries.filter((entry) => entry.kind === "LOA").map((entry) => `${mention(entry, input.mentionMode)} \`${entry.text || entry.fromLabel || "LoA"}\``);
  const strikes = entries.filter((entry) => ["STRIKE", "REMOVAL", "BLOCKED"].includes(entry.kind)).map((entry) => `${mention(entry, input.mentionMode)} \`${entry.text || entry.fromLabel || "Strike"}\``);
  const active = input.mostActiveDiscordId
    ? formatDiscordMention(input.mostActiveDiscordId, input.mentionMode)
    : input.mostActiveDisplayName || "";
  const signatures = [...input.signatures]
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((signature) => `${signature.label} **||** ${formatDiscordMention(signature.discordId, input.mentionMode)}`);

  return [
    "## Weekly Insider",
    "",
    "> ## Aktivstes Teammitglied",
    ...(active ? [`> ${active}`] : []),
    "",
    "## Administration",
    ...promotions("ADMINISTRATION"),
    "",
    "## Moderation",
    ...promotions("MODERATION"),
    "",
    "# LoA:",
    ...loa,
    "",
    "# Strikes:",
    ...strikes,
    "",
    "__ Unterschrift:__",
    "",
    ...signatures,
  ].join("\n").trimEnd();
}
