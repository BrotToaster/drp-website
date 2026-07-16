import type { Prisma, Role } from "@prisma/client";
import { cookies } from "next/headers";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { verifyAccountLinkToken } from "@/lib/account-link";
import { prisma } from "@/lib/prisma";
import { RobloxProvider, type RobloxProfile } from "@/lib/roblox-provider";

const providers: NextAuthConfig["providers"] = [
  Discord({
    clientId: process.env.AUTH_DISCORD_ID || "not-configured",
    clientSecret: process.env.AUTH_DISCORD_SECRET || "not-configured",
  }),
  RobloxProvider({
    clientId: process.env.AUTH_ROBLOX_ID || "not-configured",
    clientSecret: process.env.AUTH_ROBLOX_SECRET || "not-configured",
  }),
];

if (process.env.NODE_ENV !== "production" && process.env.AUTH_DEMO_MODE !== "false") {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo-Zugang",
      credentials: {},
      authorize() {
        return {
          id: "demo-owner",
          name: "DRP Demo-Owner",
          email: "demo@drp.local",
          role: "OWNER",
          registrationCompleted: true,
        };
      },
    }),
  );
}

function profileValue(profile: unknown, key: string) {
  if (!profile || typeof profile !== "object") return undefined;
  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

async function resolveOAuthUser(
  provider: "discord" | "roblox",
  providerAccountId: string,
  user: { name?: string | null; email?: string | null; image?: string | null } | undefined,
  profile: unknown,
) {
  const existingAccount = await prisma.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  const cookieStore = await cookies();
  const linkedUserId = verifyAccountLinkToken(
    cookieStore.get("drp-account-link")?.value,
  );
  cookieStore.delete("drp-account-link");

  let target =
    linkedUserId
      ? await prisma.user.findUnique({ where: { id: linkedUserId } })
      : provider === "discord"
        ? await prisma.user.findUnique({ where: { discordId: providerAccountId } })
        : await prisma.user.findUnique({ where: { robloxUserId: providerAccountId } });

  const robloxProfile = profile as RobloxProfile | undefined;
  const displayName =
    provider === "roblox"
      ? robloxProfile?.preferred_username || robloxProfile?.nickname || user?.name
      : profileValue(profile, "global_name") || user?.name;

  if (!target) {
    target = await prisma.user.create({
      data: {
        name: displayName || "DRP Mitglied",
        email: user?.email || null,
        avatar: user?.image || robloxProfile?.picture || null,
        discordId: provider === "discord" ? providerAccountId : null,
        robloxUserId: provider === "roblox" ? providerAccountId : null,
        robloxName:
          provider === "roblox"
            ? robloxProfile?.preferred_username || user?.name || null
            : null,
        role:
          provider === "discord" &&
          providerAccountId === process.env.OWNER_DISCORD_ID
            ? "OWNER"
            : "PLAYER",
      },
    });
  } else {
    target = await prisma.user.update({
      where: { id: target.id },
      data: {
        name: displayName || target.name,
        email: user?.email || target.email,
        avatar: user?.image || robloxProfile?.picture || target.avatar,
        discordId:
          provider === "discord" ? providerAccountId : target.discordId,
        robloxUserId:
          provider === "roblox" ? providerAccountId : target.robloxUserId,
        robloxName:
          provider === "roblox"
            ? robloxProfile?.preferred_username || user?.name || target.robloxName
            : target.robloxName,
      },
    });
  }

  await prisma.authAccount.create({
    data: {
      provider,
      providerAccountId,
      userId: target.id,
      profile: (profile || undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  const linkedProviders = await prisma.authAccount.findMany({
    where: { userId: target.id, provider: { in: ["discord", "roblox"] } },
    select: { provider: true },
  });
  const completed =
    linkedProviders.some((item) => item.provider === "discord") &&
    linkedProviders.some((item) => item.provider === "roblox");

  if (completed !== target.registrationCompleted) {
    target = await prisma.user.update({
      where: { id: target.id },
      data: { registrationCompleted: completed },
    });
  }
  return target;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "drp-local-demo-secret-change-in-production"
      : undefined),
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "discord" || account?.provider === "roblox") {
        try {
          const stored = await resolveOAuthUser(
            account.provider,
            account.providerAccountId,
            user,
            profile,
          );
          token.sub = stored.id;
          token.role = stored.role;
          token.registrationCompleted = stored.registrationCompleted;
        } catch (error) {
          console.error("OAuth account resolution failed", error);
          token.role = "PLAYER";
          token.registrationCompleted = false;
        }
      } else if (user) {
        token.role = user.role || "PLAYER";
        token.registrationCompleted = user.registrationCompleted ?? true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "unknown";
        session.user.role = (token.role || "PLAYER") as Role;
        session.user.registrationCompleted = Boolean(token.registrationCompleted);
      }
      return session;
    },
  },
});

export const discordConfigured = Boolean(
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);
export const robloxConfigured = Boolean(
  process.env.AUTH_ROBLOX_ID && process.env.AUTH_ROBLOX_SECRET,
);
