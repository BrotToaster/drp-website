export const siteConfig = {
  name: "DRP",
  fullName: "Deutschland Roleplay",
  description: "Deutschsprachiges Roleplay in Emergency Response: Liberty County. Berufe, Events und eine Community mit klaren Regeln.",
  discordUrl: process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/drpg",
  robloxUrl:
    process.env.NEXT_PUBLIC_ROBLOX_JOIN_URL ||
    "https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County",
  navigation: [
    { href: "/", label: "Start" },
    { href: "/server", label: "Server" },
    { href: "/status", label: "Status" },
    { href: "/kalender", label: "Kalender" },
    { href: "/regelwerk", label: "Regelwerk" },
    { href: "/news", label: "News" },
    { href: "/team", label: "Team" },
    { href: "/faq", label: "FAQ" },
  ],
} as const;

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(value));
}
