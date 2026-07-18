import { cookies } from "next/headers";
import {
  linkDiscordAction,
  linkRobloxAction,
  refreshDiscordAction,
  refreshRobloxAction,
  replaceDiscordAction,
  replaceRobloxAction,
} from "@/app/actions/auth";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

function accountLabel(displayName: string | null | undefined, username: string | null | undefined) {
  if (displayName && username && displayName !== username) return `${displayName} (@${username})`;
  return displayName || (username ? `@${username}` : "Authentifiziert");
}

function resultMessage(value?: string) {
  if (!value) return null;
  if (value.endsWith(":refresh:ok")) return { ok: true, text: "Die Profildaten wurden erfolgreich aktualisiert." };
  if (value.endsWith(":replace:ok")) return { ok: true, text: "Die Kontoverknüpfung wurde sicher ausgetauscht." };
  if (value.endsWith(":link:ok")) return { ok: true, text: "Das Konto wurde erfolgreich verbunden." };
  if (value.includes("ACCOUNT_IN_USE")) return { ok: false, text: "Dieses Konto ist bereits mit einem anderen DRP-Nutzer verbunden." };
  if (value.includes("ACCOUNT_MISMATCH")) return { ok: false, text: "Zur Aktualisierung musst du dasselbe Konto verwenden." };
  if (value.includes("OWNER_PROTECTED")) return { ok: false, text: "Das geschützte Owner-Discord-Konto kann nicht gewechselt werden." };
  if (value.includes("USE_REPLACE")) return { ok: false, text: "Nutze „Konto wechseln“, um eine bestehende Verknüpfung zu ersetzen." };
  return { ok: false, text: "Die Kontoverknüpfung konnte nicht geändert werden." };
}

export default async function ProfilePage() {
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { accounts: { select: { provider: true } } },
  });
  const result = resultMessage((await cookies()).get("drp-account-result")?.value);
  const demo = user.id === "demo-owner";
  const discordLinked = demo || Boolean(profile?.accounts.some((account) => account.provider === "discord"));
  const robloxLinked = demo || Boolean(profile?.accounts.some((account) => account.provider === "roblox"));
  const protectedOwner = Boolean(profile?.discordId && profile.discordId === process.env.OWNER_DISCORD_ID);

  return (
    <PortalShell authorization={authorization} title="Dein Profil" description="Authentifizierte Konten sicher aktualisieren oder bewusst wechseln.">
      {result && (
        <p role={result.ok ? "status" : "alert"} className={"mb-5 rounded-xl p-4 text-sm " + (result.ok ? "bg-[#57c98c]/10 text-[#75d7a3]" : "bg-[#ef6f6c]/10 text-[#f28d8a]")}>
          {result.text}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <section className="surface p-6 md:p-8">
          <h2 className="text-xl font-semibold">Kontoverknüpfungen</h2>
          <p className="mt-2 text-sm leading-6 text-[#858b90]">
            „Daten aktualisieren“ akzeptiert nur dasselbe Konto. „Konto wechseln“ ersetzt die Zuordnung erst nach einer neuen OAuth-Bestätigung.
          </p>
          <div className="mt-7 grid gap-3">
            <div className="rounded-xl border border-white/[0.07] p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className={"status-dot" + (robloxLinked ? "" : " offline")} />
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold">Roblox</p>
                  <p className="mt-1 text-xs text-[#777d81]">{robloxLinked ? (demo ? "DRP Demo (@DRP_Demo)" : accountLabel(profile?.robloxDisplayName, profile?.robloxName)) : "Nicht verbunden"}</p>
                  {profile?.robloxSyncedAt && <p className="mt-1 text-[11px] text-[#60666a]">Aktualisiert: {formatDateTime(profile.robloxSyncedAt)}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {robloxLinked ? (
                  <>
                    <form action={refreshRobloxAction}><SubmitButton variant="secondary" pendingText="Roblox wird geöffnet …">Daten aktualisieren</SubmitButton></form>
                    <form action={replaceRobloxAction}>
                      <ConfirmSubmitButton className="button button-secondary" message="Roblox-Konto wirklich wechseln? Du musst das neue Konto direkt bei Roblox bestätigen.">Konto wechseln</ConfirmSubmitButton>
                    </form>
                  </>
                ) : (
                  <form action={linkRobloxAction}><SubmitButton variant="secondary" pendingText="Roblox wird geöffnet …">Mit Roblox verbinden</SubmitButton></form>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.07] p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className={"status-dot" + (discordLinked ? "" : " offline")} />
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold">Discord</p>
                  <p className="mt-1 text-xs text-[#777d81]">{discordLinked ? (demo ? "DRP Demo-Owner (@demo-owner)" : accountLabel(profile?.discordDisplayName, profile?.discordUsername)) : "Nicht verbunden"}</p>
                  {profile?.discordSyncedAt && <p className="mt-1 text-[11px] text-[#60666a]">Aktualisiert: {formatDateTime(profile.discordSyncedAt)}</p>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {discordLinked ? (
                  <>
                    <form action={refreshDiscordAction}><SubmitButton variant="secondary" pendingText="Discord wird geöffnet …">Daten aktualisieren</SubmitButton></form>
                    {!protectedOwner && (
                      <form action={replaceDiscordAction}>
                        <ConfirmSubmitButton className="button button-secondary" message="Discord-Konto wirklich wechseln? Du musst das neue Konto direkt bei Discord bestätigen.">Konto wechseln</ConfirmSubmitButton>
                      </form>
                    )}
                  </>
                ) : (
                  <form action={linkDiscordAction}><SubmitButton variant="secondary" pendingText="Discord wird geöffnet …">Mit Discord verbinden</SubmitButton></form>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="surface h-fit p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">DRP-Konto</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#d6aa4c]/10 font-bold text-[#efc76e]">
              {(profile?.name || user.name || "DR").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile?.name || user.name}</p>
              <p className="mt-1 truncate text-xs text-[#777d81]">{authorization.roleNames.join(", ") || "Player"}</p>
            </div>
          </div>
          <div className="divider my-6" />
          <p className="text-xs leading-6 text-[#777d81]">
            DRP erhält niemals deine Passwörter. Discord wird nur mit „identify“ abgefragt; eine E-Mail-Adresse wird weder benötigt noch angezeigt.
          </p>
        </aside>
      </div>
    </PortalShell>
  );
}
