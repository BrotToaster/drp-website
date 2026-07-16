import type { TicketStatus } from "@prisma/client";
import type { PermissionKey } from "@/lib/permission-keys";

export type TicketAccess = {
  categoryId: string;
  canView: boolean;
  canReply: boolean;
  canAssign: boolean;
  canStatus: boolean;
};

export type AuthorizationContext = {
  userId: string;
  roleNames: string[];
  primaryRole: string;
  permissions: PermissionKey[];
  ticketAccess: TicketAccess[];
  isOwner: boolean;
};

export function hasPermission(
  context: Pick<AuthorizationContext, "permissions" | "isOwner">,
  permission: PermissionKey,
) {
  return context.isOwner || context.permissions.includes(permission);
}

export function canAccessTicketCategory(
  context: AuthorizationContext,
  categoryId: string,
  ability: "canView" | "canReply" | "canAssign" | "canStatus",
) {
  if (context.isOwner) return true;
  return context.ticketAccess.some(
    (access) => access.categoryId === categoryId && access[ability],
  );
}

export type LegacyRole = "PLAYER" | "SUPPORTER" | "MODERATOR" | "ADMIN" | "OWNER";

const legacyRoleRank: Record<LegacyRole, number> = {
  PLAYER: 0,
  SUPPORTER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasMinimumRole(current: LegacyRole, required: LegacyRole) {
  return legacyRoleRank[current] >= legacyRoleRank[required];
}

export function isStaff(role: LegacyRole) {
  return hasMinimumRole(role, "SUPPORTER");
}

const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["WAITING_USER", "RESOLVED", "CLOSED"],
  WAITING_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

export function canTransitionTicket(from: TicketStatus, to: TicketStatus) {
  return ticketTransitions[from].includes(to);
}