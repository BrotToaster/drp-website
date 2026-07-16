import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { siteConfig } from "@/lib/site";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#090b0d]/85 backdrop-blur-xl">
      <div className="container-shell flex h-[74px] items-center justify-between gap-5">
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 lg:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#aeb2b5] transition hover:bg-white/[0.04] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={session?.user ? "/dashboard" : "/login"}
            className="button button-secondary !min-h-10 !px-4 !text-xs"
          >
            {session?.user ? "Dashboard" : "Anmelden"}
          </Link>
          <a
            href={siteConfig.discordUrl}
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
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-[#9da3a8]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
