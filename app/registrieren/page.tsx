import type { Metadata } from "next";
import Link from "next/link";
import {
  linkDiscordAction,
  linkRobloxAction,
  registerWithDiscordAction,
  registerWithRobloxAction,
} from "@/app/actions/auth";
import { auth, discordConfigured, robloxConfigured } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Registrieren" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  let linked = { discord: false, roblox: false };
  if (session?.user?.id && session.user.id !== "demo-owner") {
    try {
      const accounts = await prisma.authAccount.findMany({
        where: { userId: session.user.id },
        select: { provider: true },
      });
      linked = {
        discord: accounts.some((account) => account.provider === "discord"),
        roblox: accounts.some((account) => account.provider === "roblox"),
      };
    } catch {}
  }
  const complete =
    session?.user?.id === "demo-owner" || (linked.discord && linked.roblox);

  return (
    <section className="container-shell grid min-h-[760px] place-items-center py-16">
      <div className="surface w-full max-w-lg p-7 md:p-9">
        <div className="grid grid-cols-2 rounded-full border border-white/[0.08] bg-black/20 p-1">
          <Link
            href="/login"
            className="rounded-full px-4 py-2.5 text-center text-sm font-bold text-[#858b90] hover:text-white"
          >
            Anmelden
          </Link>
          <span className="rounded-full bg-white/[0.07] px-4 py-2.5 text-center text-sm font-bold text-white">
            Registrieren
          </span>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
          Dein DRP-Konto.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#90969a]">
          Für ein eindeutiges Konto werden Discord und Roblox sicher miteinander
          verknüpft. Dein Passwort wird nie an DRP übermittelt.
        </p>

        {!session?.user ? (
          <div className="mt-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.13em] text-[#efc76e]">
              Schritt 1 · Erstes Konto verbinden
            </p>
            <div className="grid gap-3">
              <form action={registerWithDiscordAction}>
                <button
                  type="submit"
                  disabled={!discordConfigured}
                  className="button button-primary w-full"
                >
                  Registrierung mit Discord starten
                </button>
              </form>
              <form action={registerWithRobloxAction}>
                <button
                  type="submit"
                  disabled={!robloxConfigured}
                  className="button button-secondary w-full"
                >
                  Oder mit Roblox starten
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[#efc76e]">
              Kontoverknüpfung
            </p>
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] p-4">
              <span
                className={
                  "status-dot" + (linked.discord || complete ? "" : " offline")
                }
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Discord</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {linked.discord || complete ? "Verbunden" : "Noch nicht verbunden"}
                </p>
              </div>
              {!linked.discord && !complete && (
                <form action={linkDiscordAction}>
                  <button
                    disabled={!discordConfigured}
                    className="button button-secondary !min-h-9 !px-3 !text-xs"
                  >
                    Verbinden
                  </button>
                </form>
              )}
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] p-4">
              <span
                className={
                  "status-dot" + (linked.roblox || complete ? "" : " offline")
                }
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Roblox</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {linked.roblox || complete ? "Authentifiziert" : "Noch nicht verbunden"}
                </p>
              </div>
              {!linked.roblox && !complete && (
                <form action={linkRobloxAction}>
                  <button
                    disabled={!robloxConfigured}
                    className="button button-secondary !min-h-9 !px-3 !text-xs"
                  >
                    Verbinden
                  </button>
                </form>
              )}
            </div>
            {complete && (
              <div className="mt-3 rounded-xl border border-[#57c98c]/25 bg-[#57c98c]/10 p-5">
                <p className="font-semibold text-[#75d7a3]">
                  Registrierung abgeschlossen
                </p>
                <p className="mt-2 text-sm text-[#9fcfb4]">
                  Beide Konten sind verknüpft. Du kannst dich künftig mit Roblox
                  oder Discord anmelden.
                </p>
                <Link href="/dashboard" className="button button-primary mt-5">
                  Dashboard öffnen
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
