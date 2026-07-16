import { linkDiscordAction, linkRobloxAction } from "@/app/actions/auth";
import { PortalShell } from "@/components/portal-shell";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { accounts: { select: { provider: true } } },
  });
  const discordLinked =
    user.id === "demo-owner" ||
    profile?.accounts.some((account) => account.provider === "discord");
  const robloxLinked =
    user.id === "demo-owner" ||
    profile?.accounts.some((account) => account.provider === "roblox");

  return (
    <PortalShell role={user.role} title="Dein Profil" description="Deine sicher authentifizierten Roblox- und Discord-Konten.">
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <section className="surface p-6 md:p-8">
          <h2 className="text-xl font-semibold">Kontoverknüpfungen</h2>
          <p className="mt-2 text-sm leading-6 text-[#858b90]">Roblox bestätigt deine Spielidentität. Discord bleibt der direkte Kommunikationsweg zur Community.</p>
          <div className="mt-7 grid gap-3">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] p-5">
              <span className={"status-dot" + (robloxLinked ? "" : " offline")} />
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold">Roblox</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {robloxLinked
                    ? (profile?.robloxName || "Authentifiziert") +
                      (profile?.robloxUserId ? " · ID " + profile.robloxUserId : "")
                    : "Nicht verbunden"}
                </p>
              </div>
              {!robloxLinked && <form action={linkRobloxAction}><button className="button button-secondary !min-h-10 !text-xs">Mit Roblox verbinden</button></form>}
            </div>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] p-5">
              <span className={"status-dot" + (discordLinked ? "" : " offline")} />
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold">Discord</p>
                <p className="mt-1 text-xs text-[#777d81]">
                  {discordLinked ? (profile?.discordId ? "Verifiziert · ID " + profile.discordId : "Verifiziert") : "Nicht verbunden"}
                </p>
              </div>
              {!discordLinked && <form action={linkDiscordAction}><button className="button button-secondary !min-h-10 !text-xs">Mit Discord verbinden</button></form>}
            </div>
          </div>
        </section>
        <aside className="surface h-fit p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#777d81]">DRP-Konto</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#d6aa4c]/10 font-bold text-[#efc76e]">{(profile?.name || user.name || "DR").slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{profile?.name || user.name}</p>
              <p className="mt-1 truncate text-xs text-[#777d81]">{profile?.email || "Mitglied bei DRP"}</p>
            </div>
          </div>
          <div className="divider my-6" />
          <p className="text-xs leading-6 text-[#777d81]">DRP erhält niemals deine Passwörter. Die Bestätigung erfolgt direkt auf den offiziellen Seiten von Roblox und Discord.</p>
        </aside>
      </div>
    </PortalShell>
  );
}
