import type { OAuthConfig } from "next-auth/providers";

export type RobloxProfile = {
  sub: string;
  name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string | null;
};

export function RobloxProvider(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<RobloxProfile> {
  return {
    id: "roblox",
    name: "Roblox",
    type: "oidc",
    issuer: "https://apis.roblox.com/oauth/",
    authorization: { params: { scope: "openid profile" } },
    checks: ["pkce", "state"],
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.preferred_username || profile.nickname || profile.name || "Roblox-Nutzer",
        image: profile.picture || null,
      };
    },
  };
}
