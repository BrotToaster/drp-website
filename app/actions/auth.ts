"use server";

import { cookies } from "next/headers";
import { auth, signIn } from "@/auth";
import {
  createAccountLinkToken,
  type AccountLinkIntent,
  type AccountLinkProvider,
} from "@/lib/account-link";

export async function loginWithDiscordAction() {
  await signIn("discord", { redirectTo: "/dashboard" });
}

export async function loginWithRobloxAction() {
  await signIn("roblox", { redirectTo: "/dashboard" });
}

export async function registerWithDiscordAction() {
  await signIn("discord", { redirectTo: "/registrieren" });
}

export async function registerWithRobloxAction() {
  await signIn("roblox", { redirectTo: "/registrieren" });
}

async function authorizeProviderChange(
  provider: AccountLinkProvider,
  intent: AccountLinkIntent,
  redirectTo: string,
) {
  const session = await auth();
  if (!session?.user?.id) {
    await signIn(provider, { redirectTo: "/registrieren" });
    return;
  }
  const store = await cookies();
  store.set("drp-account-link", createAccountLinkToken(session.user.id, provider, intent), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  store.delete("drp-account-result");
  await signIn(provider, { redirectTo });
}

export async function linkDiscordAction() {
  await authorizeProviderChange("discord", "link", "/registrieren");
}

export async function linkRobloxAction() {
  await authorizeProviderChange("roblox", "link", "/registrieren");
}

export async function refreshDiscordAction() {
  await authorizeProviderChange("discord", "refresh", "/dashboard/profil");
}

export async function refreshRobloxAction() {
  await authorizeProviderChange("roblox", "refresh", "/dashboard/profil");
}

export async function replaceDiscordAction() {
  await authorizeProviderChange("discord", "replace", "/dashboard/profil");
}

export async function replaceRobloxAction() {
  await authorizeProviderChange("roblox", "replace", "/dashboard/profil");
}
