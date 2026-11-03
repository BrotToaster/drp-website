import { auth } from "@/auth";
import { HeaderClient } from "@/components/header-client";
import { getHomepageSettings } from "@/lib/site-settings";
import { FirstVisitIntro } from "@/components/first-visit-intro";

export async function Header() {
  const [session, homepage] = await Promise.all([auth(), getHomepageSettings()]);

  return <><HeaderClient authenticated={Boolean(session?.user)} discordUrl={homepage.discordUrl} /><FirstVisitIntro authenticated={Boolean(session?.user)} /></>;
}
