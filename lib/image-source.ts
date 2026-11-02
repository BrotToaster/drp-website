export function optimizableImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return !src.startsWith("/api/");
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    return ["res.cloudinary.com", "cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname) || url.hostname.endsWith(".rbxcdn.com") || (url.hostname === "api.erlc.gg" && url.pathname.startsWith("/maps/"));
  } catch { return false; }
}
