import "server-only";

// Bundled copies of the public ER:LC maps keep page rendering independent of
// the multi-megabyte upstream PNGs. Refresh with npm run assets:maps.
export async function getOfficialErlcMapUrl({ postals = false }: { postals?: boolean } = {}) {
  return postals ? "/maps/liberty-county-postals.webp" : "/maps/liberty-county.webp";
}
