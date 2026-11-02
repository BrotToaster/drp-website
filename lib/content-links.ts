export function safeContentHref(value: unknown) {
  if (typeof value !== "string" || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  if ((value.startsWith("/") && !value.startsWith("//")) || value.startsWith("#")) return value;
  if (!/^(https?:|mailto:)/i.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.username || url.password) return undefined;
    return value;
  } catch { return undefined; }
}
