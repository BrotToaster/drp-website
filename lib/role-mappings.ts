import type { AuthorizationContext } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

export function canManageDiscordRoleMappings(
  context: Pick<AuthorizationContext, "permissions" | "isOwner">,
) {
  return hasPermission(context, "roles.manage") && hasPermission(context, "discord.manage");
}

export function diffDiscordRoleMappings(previousIds: string[], nextIds: string[]) {
  const previous = new Set(previousIds.filter(Boolean));
  const next = new Set(nextIds.filter(Boolean));
  return {
    added: [...next].filter((id) => !previous.has(id)),
    removed: [...previous].filter((id) => !next.has(id)),
    retained: [...next].filter((id) => previous.has(id)),
  };
}
