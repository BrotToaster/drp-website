import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  loginWithDiscordAction,
  loginWithRobloxAction,
} from "@/app/actions/auth";
import { auth, discordConfigured, robloxConfigured, signIn } from "@/auth";
import { demoAccessEnabled } from "@/lib/local-mode";
import { hostedPreviewEnabled } from "@/lib/preview-mode";
import { PreviewLogin } from "@/components/preview-login";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.registrationCompleted) redirect("/dashboard");
  if (hostedPreviewEnabled()) return <PreviewLogin />;
  const demoEnabled = demoAccessEnabled();

  return (
    <section className="container-shell grid min-h-[720px] place-items-center py-16">
      <div className="surface w-full max-w-md p-7 md:p-9">
        <div className="grid grid-cols-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          <span className="rounded-full bg-[var(--surface-soft)] px-4 py-2.5 text-center text-sm font-bold text-[var(--text)]">
            Anmelden
          </span>
          <Link
            href="/registrieren"
            className="rounded-full px-4 py-2.5 text-center text-sm font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            Registrieren
          </Link>
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">
          Willkommen zurück.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
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
            <p className="text-center text-xs leading-5 text-[var(--muted)]">
              Die echten Logins werden nach Eintragen der OAuth-Zugangsdaten in
              der .env-Datei aktiviert.
            </p>
          )}
          {demoEnabled && (
            <>
              <div className="my-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
                <span className="h-px flex-1 bg-[var(--surface-soft)]" />
                Lokaler Testzugang
                <span className="h-px flex-1 bg-[var(--surface-soft)]" />
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
