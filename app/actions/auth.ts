"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { auth, signIn } from "@/auth";
import { secureApplicationCookies } from "@/lib/local-mode";
import {
  createAccountLinkToken,
  type AccountLinkIntent,
  type AccountLinkProvider,
} from "@/lib/account-link";

export async function loginWithDiscordAction() {
  if (hostedPreviewEnabled()) redirect("/login");
  await signIn("discord", { redirectTo: "/dashboard" });
}

export async function loginWithRobloxAction() {
  if (hostedPreviewEnabled()) redirect("/login");
  await signIn("roblox", { redirectTo: "/dashboard" });
}

export async function registerWithDiscordAction() {
  if (hostedPreviewEnabled()) redirect("/login");
  await signIn("discord", { redirectTo: "/registrieren" });
}

export async function registerWithRobloxAction() {
  if (hostedPreviewEnabled()) redirect("/login");
  await signIn("roblox", { redirectTo: "/registrieren" });
}

async function authorizeProviderChange(
  provider: AccountLinkProvider,
  intent: AccountLinkIntent,
  redirectTo: string,
) {
  if (hostedPreviewEnabled()) redirect("/dashboard/profil?preview=offline");
  const session = await auth();
  if (!session?.user?.id) {
    await signIn(provider, { redirectTo: "/registrieren" });
    return;
  }
  const store = await cookies();
  store.set("drp-account-link", createAccountLinkToken(session.user.id, provider, intent), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureApplicationCookies(),
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
