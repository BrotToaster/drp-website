export const appearanceKey = "drp-appearance";
export type Appearance = "light" | "dark";

export function resolveAppearance(preference: string | null, systemDark: boolean): Appearance {
  return preference === "light" || preference === "dark" ? preference : systemDark ? "dark" : "light";
}

// Runs before the page is painted; no network request or user data is involved.
export const appearanceBootScript = `(()=>{let p=null;try{p=localStorage.getItem("${appearanceKey}")}catch{}const d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.appearance=d?"dark":"light"})()`;
