import { auth } from "@/auth";
import { ActiveNavLink } from "@/components/active-nav-link";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";
import { getHomepageSettings } from "@/lib/site-settings";

const navClass =
  "rounded-full border border-transparent px-3 py-2 text-[12px] xl:px-4 xl:text-[13px] font-semibold text-[#aeb2b5] transition hover:bg-white/[0.04] hover:text-white";
const activeClass =
  "!border-[#d6aa4c]/25 !bg-[#d6aa4c]/10 !text-[#efc76e]";

export async function Header() {
  const [session, homepage] = await Promise.all([auth(), getHomepageSettings()]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#090b0d]/85 backdrop-blur-xl">
      <div className="container-shell flex h-[74px] items-center justify-between gap-5">
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 lg:flex">
          {siteConfig.navigation.map((item) => (
            <ActiveNavLink
              key={item.href}
              href={item.href}
              className={navClass}
              activeClassName={activeClass}
            >
              {item.label}
            </ActiveNavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ActiveNavLink
            href={session?.user ? "/dashboard" : "/login"}
            className="button button-secondary !min-h-10 !px-4 !text-xs"
            activeClassName="!border-[#d6aa4c]/40 !bg-[#d6aa4c]/10 !text-[#efc76e]"
          >
            {session?.user ? "Dashboard" : "Anmelden"}
          </ActiveNavLink>
          <a
            href={homepage.discordUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-primary !hidden !min-h-10 !px-4 !text-xs sm:!inline-flex"
          >
            Discord
          </a>
        </div>
      </div>
      <nav
        aria-label="Mobile Navigation"
        className="container-shell flex gap-1 overflow-x-auto pb-3 lg:hidden"
      >
        {siteConfig.navigation.map((item) => (
          <ActiveNavLink
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-[#9da3a8]"
            activeClassName={activeClass}
          >
            {item.label}
          </ActiveNavLink>
        ))}
      </nav>
    </header>
  );
}