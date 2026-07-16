"use server";

import { cookies } from "next/headers";
import { auth, signIn } from "@/auth";
import { createAccountLinkToken } from "@/lib/account-link";

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

async function linkProvider(provider: "discord" | "roblox") {
  const session = await auth();
  if (!session?.user?.id) {
    await signIn(provider, { redirectTo: "/registrieren" });
    return;
  }
  const store = await cookies();
  store.set("drp-account-link", createAccountLinkToken(session.user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  await signIn(provider, { redirectTo: "/registrieren" });
}

export async function linkDiscordAction() {
  await linkProvider("discord");
}

export async function linkRobloxAction() {
  await linkProvider("roblox");
}
