import { linkDiscordAction, linkRobloxAction } from "@/app/actions/auth";
import { PortalShell } from "@/components/portal-shell";
import { SubmitButton } from "@/components/submit-button";
import { ensureDbUser, getAuthorizationContext } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function accountLabel(displayName: string | null | undefined, username: string | null | undefined) {
  if (displayName && username && displayName !== username) return `${displayName} (@${username})`;
  return displayName || (username ? `@${username}` : "Authentifiziert");
}

export default async function ProfilePage() {
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { accounts: { select: { provider: true } } },
  });
  const demo = user.id === "demo-owner";
  const discordLinked =
    demo || Boolean(profile?.accounts.some((account) => account.provider === "discord"));
  const robloxLinked =
    demo || Boolean(profile?.accounts.some((account) => account.provider === "roblox"));

  return (
    <PortalShell
      authorization={authorization}
      title="Dein Profil"
      description="Deine sicher authentifizierten Roblox- und Discord-Konten."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <section className="surface p-6 md:p-8">
          <h2 className="text-xl font-semibold">Kontoverknüpfungen</h2>
          <p className="mt-2 text-sm leading-6 text-[#858b90]">
            Roblox bestätigt deine Spielidentität. Discord ist dein direkter Kommunikationsweg zur Community.
          </p>
          <div className="mt-7 grid gap-3">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] p-5">
              <span className={"status-dot" + (robloxLinked ? "" : " offline")} />
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold">Roblox</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {robloxLinked
                    ? demo
                      ? "DRP Demo (@DRP_Demo)"
                      : accountLabel(profile?.robloxDisplayName, profile?.robloxName)
                    : "Nicht verbunden"}
                </p>
              </div>
              {!robloxLinked && (
                <form action={linkRobloxAction}>
                  <SubmitButton variant="secondary" pendingText="Roblox wird geöffnet …">Mit Roblox verbinden</SubmitButton>
                </form>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] p-5">
              <span className={"status-dot" + (discordLinked ? "" : " offline")} />
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold">Discord</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {discordLinked
                    ? demo
                      ? "DRP Demo-Owner (@demo-owner)"
                      : accountLabel(profile?.discordDisplayName, profile?.discordUsername)
                    : "Nicht verbunden"}
                </p>
              </div>
              {!discordLinked && (
                <form action={linkDiscordAction}>
                  <SubmitButton variant="secondary" pendingText="Discord wird geöffnet …">Mit Discord verbinden</SubmitButton>
                </form>
              )}
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
            DRP erhält niemals deine Passwörter. Die Bestätigung erfolgt direkt bei Roblox und Discord. E-Mail-Adressen und technische IDs werden hier nicht angezeigt.
          </p>
        </aside>
      </div>
    </PortalShell>
  );
}