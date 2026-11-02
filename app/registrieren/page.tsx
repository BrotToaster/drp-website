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
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { PreviewLogin } from "@/components/preview-login";

export const metadata: Metadata = { title: "Registrieren", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (hostedPreviewEnabled()) return <PreviewLogin />;
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
        <div className="grid grid-cols-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          <Link
            href="/login"
            className="rounded-full px-4 py-2.5 text-center text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            Anmelden
          </Link>
          <span className="rounded-full bg-[var(--surface-soft)] px-4 py-2.5 text-center text-sm font-bold text-[var(--text)]">
            Registrieren
          </span>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
          Dein DRP-Konto.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Für ein eindeutiges Konto werden Discord und Roblox sicher miteinander
          verknüpft. Dein Passwort wird nie an DRP übermittelt.
        </p>

        {!session?.user ? (
          <div className="mt-8" data-intro="account">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.13em] text-[var(--accent-ink)]">
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
          <div className="mt-8 grid gap-3" data-intro="account">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.13em] text-[var(--accent-ink)]">
              Kontoverknüpfung
            </p>
            <div className="flex items-center gap-4 rounded-xl border border-[var(--line)] p-4">
              <span
                className={
                  "status-dot" + (linked.discord || complete ? "" : " offline")
                }
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Discord</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
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
            <div className="flex items-center gap-4 rounded-xl border border-[var(--line)] p-4">
              <span
                className={
                  "status-dot" + (linked.roblox || complete ? "" : " offline")
                }
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Roblox</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
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
                <p className="font-semibold text-[var(--success-ink)]">
                  Registrierung abgeschlossen
                </p>
                <p className="mt-2 text-sm text-[var(--success-ink)]">
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
        <p className="mt-6 text-sm text-[var(--muted)]">Hinweise zu Kontoverknüpfung und Datenverarbeitung: <Link className="underline underline-offset-4" href="/datenschutz">Datenschutz</Link> · <Link className="underline underline-offset-4" href="/nutzungsbedingungen">Nutzungsregeln</Link></p>
      </div>
    </section>
  );
}
