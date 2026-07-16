import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  loginWithDiscordAction,
  loginWithRobloxAction,
} from "@/app/actions/auth";
import { auth, discordConfigured, robloxConfigured, signIn } from "@/auth";

export const metadata: Metadata = { title: "Anmelden" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.registrationCompleted) redirect("/dashboard");
  const demoEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_DEMO_MODE !== "false";

  return (
    <section className="container-shell grid min-h-[720px] place-items-center py-16">
      <div className="surface w-full max-w-md p-7 md:p-9">
        <div className="grid grid-cols-2 rounded-full border border-white/[0.08] bg-black/20 p-1">
          <span className="rounded-full bg-white/[0.07] px-4 py-2.5 text-center text-sm font-bold text-white">
            Anmelden
          </span>
          <Link
            href="/registrieren"
            className="rounded-full px-4 py-2.5 text-center text-sm font-bold text-[#858b90] hover:text-white"
          >
            Registrieren
          </Link>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
          Willkommen zurück.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#90969a]">
          Melde dich mit einem bereits verknüpften Roblox- oder Discord-Konto an.
        </p>
        <div className="mt-8 grid gap-3">
          <form action={loginWithRobloxAction}>
            <button
              type="submit"
              disabled={!robloxConfigured}
              className="button button-primary w-full"
            >
              Mit Roblox anmelden
            </button>
          </form>
          <form action={loginWithDiscordAction}>
            <button
              type="submit"
              disabled={!discordConfigured}
              className="button button-secondary w-full"
            >
              Mit Discord anmelden
            </button>
          </form>
          {(!discordConfigured || !robloxConfigured) && (
            <p className="text-center text-xs leading-5 text-[#70767a]">
              Die echten Logins werden nach Eintragen der OAuth-Zugangsdaten in
              der .env-Datei aktiviert.
            </p>
          )}
          {demoEnabled && (
            <>
              <div className="my-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#60666a]">
                <span className="h-px flex-1 bg-white/[0.07]" />
                Lokale Entwicklung
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
              <form
                action={async () => {
                  "use server";
                  await signIn("demo", { redirectTo: "/dashboard" });
                }}
              >
                <button type="submit" className="button button-secondary w-full">
                  Demo als Owner öffnen
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
