import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { verifyAccountLinkToken, type AccountLinkRequest } from "@/lib/account-link";
import { applyDiscordRoleMappings } from "@/lib/discord-sync";
import { prisma } from "@/lib/prisma";
import { ensureBaseRoleAssignments } from "@/lib/role-assignments";
import { RobloxProvider, type RobloxProfile } from "@/lib/roblox-provider";

const providers: NextAuthConfig["providers"] = [
  Discord({
    clientId: process.env.AUTH_DISCORD_ID || "not-configured",
    clientSecret: process.env.AUTH_DISCORD_SECRET || "not-configured",
    authorization: { params: { scope: "identify" } },
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
        return { id: "demo-owner", name: "DRP Demo-Owner", registrationCompleted: true };
      },
    }),
  );
}

function profileValue(profile: unknown, key: string) {
  if (!profile || typeof profile !== "object") return undefined;
  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function resultCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 2 * 60,
  };
}

async function resolveOAuthUser(
  provider: "discord" | "roblox",
  providerAccountId: string,
  oauthUser: { name?: string | null; email?: string | null; image?: string | null } | undefined,
  profile: unknown,
) {
  const cookieStore = await cookies();
  const requested = verifyAccountLinkToken(cookieStore.get("drp-account-link")?.value);
  const linkRequest = requested?.provider === provider ? requested : null;

  const existingAccount = await prisma.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });
  let existingUser = existingAccount?.user;
  let previousProviderAccountId: string | null = null;

  if (linkRequest) {
    const target = await prisma.user.findUnique({ where: { id: linkRequest.userId } });
    if (!target) throw new Error("TARGET_MISSING");
    const currentAccount = await prisma.authAccount.findUnique({
      where: { userId_provider: { userId: target.id, provider } },
    });
    previousProviderAccountId = currentAccount?.providerAccountId || null;

    if (existingAccount && existingAccount.userId !== target.id) throw new Error("ACCOUNT_IN_USE");
    const providerUser = provider === "discord"
      ? await prisma.user.findUnique({ where: { discordId: providerAccountId } })
      : await prisma.user.findUnique({ where: { robloxUserId: providerAccountId } });
    if (providerUser && providerUser.id !== target.id) throw new Error("ACCOUNT_IN_USE");

    if (linkRequest.intent === "refresh" && currentAccount?.providerAccountId !== providerAccountId) {
      throw new Error("ACCOUNT_MISMATCH");
    }
    if (linkRequest.intent === "link" && currentAccount && currentAccount.providerAccountId !== providerAccountId) {
      throw new Error("USE_REPLACE");
    }
    if (
      linkRequest.intent === "replace" &&
      provider === "discord" &&
      currentAccount?.providerAccountId === process.env.OWNER_DISCORD_ID &&
      currentAccount?.providerAccountId !== providerAccountId
    ) {
      throw new Error("OWNER_PROTECTED");
    }
    existingUser = target;
  } else if (!existingUser) {
    existingUser =
      (provider === "discord"
        ? await prisma.user.findUnique({ where: { discordId: providerAccountId } })
        : await prisma.user.findUnique({ where: { robloxUserId: providerAccountId } })) ||
      undefined;
  }

  const roblox = profile as RobloxProfile | undefined;
  const discordUsername = profileValue(profile, "username") || oauthUser?.name || null;
  const discordDisplayName = profileValue(profile, "global_name") || discordUsername || null;
  const robloxUsername = roblox?.preferred_username || roblox?.name || oauthUser?.name || null;
  const robloxDisplayName = roblox?.nickname || robloxUsername || null;
  const providerAvatar = provider === "discord" ? oauthUser?.image || null : roblox?.picture || oauthUser?.image || null;
  const displayName = provider === "discord" ? discordDisplayName : robloxDisplayName;
  const syncedAt = new Date();

  const target = await prisma.$transaction(async (tx) => {
    if (
      linkRequest?.intent === "replace" &&
      previousProviderAccountId &&
      previousProviderAccountId !== providerAccountId
    ) {
      await tx.authAccount.delete({
        where: { userId_provider: { userId: linkRequest.userId, provider } },
      });
    }

    const userData = {
      name: displayName || existingUser?.name || "DRP Mitglied",
      email: null,
      avatar: providerAvatar || existingUser?.avatar || null,
      discordId: provider === "discord" ? providerAccountId : existingUser?.discordId || null,
      discordUsername: provider === "discord" ? discordUsername : existingUser?.discordUsername || null,
      discordDisplayName: provider === "discord" ? discordDisplayName : existingUser?.discordDisplayName || null,
      discordAvatarUrl: provider === "discord" ? providerAvatar : existingUser?.discordAvatarUrl || null,
      discordSyncedAt: provider === "discord" ? syncedAt : existingUser?.discordSyncedAt || null,
      robloxUserId: provider === "roblox" ? providerAccountId : existingUser?.robloxUserId || null,
      robloxName: provider === "roblox" ? robloxUsername : existingUser?.robloxName || null,
      robloxDisplayName: provider === "roblox" ? robloxDisplayName : existingUser?.robloxDisplayName || null,
      robloxAvatarUrl: provider === "roblox" ? providerAvatar : existingUser?.robloxAvatarUrl || null,
      robloxSyncedAt: provider === "roblox" ? syncedAt : existingUser?.robloxSyncedAt || null,
    };

    let stored = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: userData })
      : await tx.user.create({ data: userData });

    await tx.authAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      update: { userId: stored.id, profile: (profile || undefined) as Prisma.InputJsonValue | undefined },
      create: {
        provider,
        providerAccountId,
        userId: stored.id,
        profile: (profile || undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await ensureBaseRoleAssignments(tx, stored.id, stored.discordId);
    if (stored.discordId) {
      const snapshot = await tx.discordMemberSnapshot.findFirst({
        where: { discordId: stored.discordId },
        orderBy: { lastSyncedAt: "desc" },
      });
      if (snapshot) await applyDiscordRoleMappings(tx, stored.id, snapshot.guildId, stringArray(snapshot.roleIds));
    }

    const linkedProviders = await tx.authAccount.findMany({
      where: { userId: stored.id, provider: { in: ["discord", "roblox"] } },
      select: { provider: true },
    });
    const completed =
      linkedProviders.some((item) => item.provider === "discord") &&
      linkedProviders.some((item) => item.provider === "roblox");
    if (completed !== stored.registrationCompleted) {
      stored = await tx.user.update({ where: { id: stored.id }, data: { registrationCompleted: completed } });
    }

    if (linkRequest) {
      await tx.auditLog.create({
        data: {
          actorId: stored.id,
          action:
            linkRequest.intent === "replace"
              ? "OAUTH_ACCOUNT_REPLACED"
              : linkRequest.intent === "refresh"
                ? "OAUTH_PROFILE_REFRESHED"
                : "OAUTH_ACCOUNT_LINKED",
          entityType: "User",
          entityId: stored.id,
          metadata: { provider, previousProviderAccountId, providerAccountId },
        },
      });
    }
    return stored;
  });

  if (linkRequest) {
    cookieStore.delete("drp-account-link");
    cookieStore.set("drp-account-result", provider + ":" + linkRequest.intent + ":ok", resultCookieOptions());
  }
  return target;
}

async function recoverRequestedUser(request: AccountLinkRequest | null) {
  if (!request) return null;
  return prisma.user.findUnique({ where: { id: request.userId } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? "drp-local-demo-secret-change-in-production" : undefined),
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "discord" || account?.provider === "roblox") {
        try {
          const stored = await resolveOAuthUser(account.provider, account.providerAccountId, user, profile);
          token.sub = stored.id;
          token.registrationCompleted = stored.registrationCompleted;
        } catch (error) {
          console.error("OAuth account resolution failed", error);
          const store = await cookies();
          const request = verifyAccountLinkToken(store.get("drp-account-link")?.value);
          const requestedUser = request?.provider === account.provider ? await recoverRequestedUser(request) : null;
          if (requestedUser) {
            token.sub = requestedUser.id;
            token.registrationCompleted = requestedUser.registrationCompleted;
            const reason = error instanceof Error ? error.message : "UNKNOWN";
            store.set("drp-account-result", account.provider + ":error:" + reason, resultCookieOptions());
          } else {
            token.registrationCompleted = false;
          }
          store.delete("drp-account-link");
        }
      } else if (user) {
        token.registrationCompleted = user.registrationCompleted ?? true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "unknown";
        session.user.registrationCompleted = Boolean(token.registrationCompleted);
      }
      return session;
    },
  },
});

export const discordConfigured = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
export const robloxConfigured = Boolean(process.env.AUTH_ROBLOX_ID && process.env.AUTH_ROBLOX_SECRET);
