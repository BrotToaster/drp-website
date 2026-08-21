import { auth } from "@/auth";
import { HeaderClient } from "@/components/header-client";
import { getHomepageSettings } from "@/lib/site-settings";

export async function Header() {
  const [session, homepage] = await Promise.all([auth(), getHomepageSettings()]);

  return <HeaderClient authenticated={Boolean(session?.user)} discordUrl={homepage.discordUrl} />;
}
