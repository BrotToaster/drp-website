import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { verifyAccountLinkToken } from "@/lib/account-link";
import { ensureBaseRoleAssignments } from "@/lib/role-assignments";
import { applyDiscordRoleMappings } from "@/lib/discord-sync";
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

function stringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function resolveOAuthUser(
  provider: "discord" | "roblox",
  providerAccountId: string,
  oauthUser: { name?: string | null; email?: string | null; image?: string | null } | undefined,
  profile: unknown,
) {
  const existingAccount = await prisma.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });

  const cookieStore = await cookies();
  const linkedUserId = existingAccount
    ? undefined
    : verifyAccountLinkToken(cookieStore.get("drp-account-link")?.value);
  if (!existingAccount) cookieStore.delete("drp-account-link");

  let existingUser = existingAccount?.user;
  if (!existingUser) {
    existingUser =
      (linkedUserId
        ? await prisma.user.findUnique({ where: { id: linkedUserId } })
        : provider === "discord"
          ? await prisma.user.findUnique({ where: { discordId: providerAccountId } })
          : await prisma.user.findUnique({ where: { robloxUserId: providerAccountId } })) ||
      undefined;
  }

  const roblox = profile as RobloxProfile | undefined;
  const discordUsername = profileValue(profile, "username") || oauthUser?.name || null;
  const discordDisplayName =
    profileValue(profile, "global_name") || discordUsername || null;
  const robloxUsername =
    roblox?.preferred_username || roblox?.name || oauthUser?.name || null;
  const robloxDisplayName = roblox?.nickname || robloxUsername || null;
  const displayName =
    provider === "discord" ? discordDisplayName : robloxDisplayName;

  return prisma.$transaction(async (tx) => {
    const userData = {
      name: displayName || existingUser?.name || "DRP Mitglied",
      email: oauthUser?.email || existingUser?.email || null,
      avatar: oauthUser?.image || roblox?.picture || existingUser?.avatar || null,
      discordId:
        provider === "discord" ? providerAccountId : existingUser?.discordId || null,
      discordUsername:
        provider === "discord" ? discordUsername : existingUser?.discordUsername || null,
      discordDisplayName:
        provider === "discord"
          ? discordDisplayName
          : existingUser?.discordDisplayName || null,
      robloxUserId:
        provider === "roblox" ? providerAccountId : existingUser?.robloxUserId || null,
      robloxName:
        provider === "roblox" ? robloxUsername : existingUser?.robloxName || null,
      robloxDisplayName:
        provider === "roblox"
          ? robloxDisplayName
          : existingUser?.robloxDisplayName || null,
    };

    let target = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: userData })
      : await tx.user.create({ data: userData });

    await tx.authAccount.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      update: {
        userId: target.id,
        profile: (profile || undefined) as Prisma.InputJsonValue | undefined,
      },
      create: {
        provider,
        providerAccountId,
        userId: target.id,
        profile: (profile || undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await ensureBaseRoleAssignments(tx, target.id, target.discordId);

    if (target.discordId) {
      const snapshot = await tx.discordMemberSnapshot.findFirst({
        where: { discordId: target.discordId },
        orderBy: { lastSyncedAt: "desc" },
      });
      if (snapshot) {
        await applyDiscordRoleMappings(
          tx,
          target.id,
          snapshot.guildId,
          stringArray(snapshot.roleIds),
        );
      }
    }

    const linkedProviders = await tx.authAccount.findMany({
      where: { userId: target.id, provider: { in: ["discord", "roblox"] } },
      select: { provider: true },
    });
    const completed =
      linkedProviders.some((item) => item.provider === "discord") &&
      linkedProviders.some((item) => item.provider === "roblox");

    if (completed !== target.registrationCompleted) {
      target = await tx.user.update({
        where: { id: target.id },
        data: { registrationCompleted: completed },
      });
    }
    return target;
  });
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
          token.registrationCompleted = stored.registrationCompleted;
        } catch (error) {
          console.error("OAuth account resolution failed", error);
          token.registrationCompleted = false;
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

export const discordConfigured = Boolean(
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);
export const robloxConfigured = Boolean(
  process.env.AUTH_ROBLOX_ID && process.env.AUTH_ROBLOX_SECRET,
);