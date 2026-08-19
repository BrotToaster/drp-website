import type { TicketStatus } from "@prisma/client";
import type { PermissionKey } from "@/lib/permission-keys";

export type TicketAccess = {
  categoryId: string;
  canView: boolean;
  canReply: boolean;
  canAssign: boolean;
  canStatus: boolean;
  canDelete: boolean;
};

export type DocumentAccess = {
  categoryId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
};

export type CalendarAccess = {
  categoryId: string;
  canCreate: boolean;
  canPublish: boolean;
  canEditOwn: boolean;
  canManage: boolean;
};

export type AuthorizationContext = {
  userId: string;
  roleIds: string[];
  roleNames: string[];
  primaryRole: string;
  permissions: PermissionKey[];
  ticketAccess: TicketAccess[];
  documentAccess: DocumentAccess[];
  calendarAccess: CalendarAccess[];
  isOwner: boolean;
};

export type InternalDocumentAuthorization = {
  categoryId: string;
  accessMode: "CATEGORY" | "RESTRICTED";
  roleAccess?: { roleId: string; canView: boolean }[];
};

export function hasPermission(
  context: Pick<AuthorizationContext, "permissions" | "isOwner">,
  permission: PermissionKey,
) {
  return context.isOwner || context.permissions.includes(permission);
}

export function canAccessDocumentCategory(
  context: AuthorizationContext,
  categoryId: string,
  ability: "canView" | "canCreate" | "canEdit" | "canManage",
) {
  if (context.isOwner) return true;
  return context.documentAccess.some(
    (access) => access.categoryId === categoryId && access[ability],
  );
}

export function canViewInternalDocument(
  context: AuthorizationContext,
  document: InternalDocumentAuthorization,
) {
  if (context.isOwner) return true;
  if (!canAccessDocumentCategory(context, document.categoryId, "canView")) return false;
  if (document.accessMode === "CATEGORY") return true;
  return Boolean(document.roleAccess?.some((access) => access.canView && context.roleIds.includes(access.roleId)));
}

export function canAccessCalendarCategory(
  context: AuthorizationContext,
  categoryId: string,
  ability: "canCreate" | "canPublish" | "canEditOwn" | "canManage",
) {
  if (context.isOwner) return true;
  return context.calendarAccess.some(
    (access) => access.categoryId === categoryId && access[ability],
  );
}

export function canAccessTicketCategory(
  context: AuthorizationContext,
  categoryId: string,
  ability: "canView" | "canReply" | "canAssign" | "canStatus" | "canDelete",
) {
  if (context.isOwner) return true;
  return context.ticketAccess.some(
    (access) => access.categoryId === categoryId && access[ability],
  );
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
