import { describe, expect, it } from "vitest";
import {
  canAccessTicketCategory,
  canTransitionTicket,
  canViewInternalDocument,
  hasPermission,
  type AuthorizationContext,
} from "@/lib/permissions";

const context: AuthorizationContext = {
  userId: "user-1",
  roleIds: ["role-supporter", "role-editorial"],
  roleNames: ["Supporter", "Redaktion"],
  primaryRole: "Redaktion",
  permissions: ["staff.access", "tickets.view", "news.edit"],
  ticketAccess: [
    {
      categoryId: "contact",
      canView: true,
      canReply: false,
      canAssign: false,
      canStatus: false,
      canDelete: false,
    },
    {
      categoryId: "contact",
      canView: false,
      canReply: true,
      canAssign: false,
      canStatus: false,
      canDelete: true,
    },
  ],
  documentAccess: [],
  calendarAccess: [],
  isOwner: false,
};

describe("Kombinierbare Rechte und Ticketstatus", () => {
  it("vereinigt Rechte mehrerer Rollen", () => {
    expect(hasPermission(context, "tickets.view")).toBe(true);
    expect(hasPermission(context, "news.edit")).toBe(true);
    expect(hasPermission(context, "roles.manage")).toBe(false);
  });

  it("erteilt dem geschützten Owner jedes Recht", () => {
    expect(hasPermission({ permissions: [], isOwner: true }, "roles.manage")).toBe(true);
  });

  it("wertet kategoriebasierte Rechte aus", () => {
    expect(canAccessTicketCategory(context, "contact", "canView")).toBe(true);
    expect(canAccessTicketCategory(context, "contact", "canReply")).toBe(true);
    expect(canAccessTicketCategory(context, "contact", "canDelete")).toBe(true);
    expect(canAccessTicketCategory(context, "technical", "canView")).toBe(false);
  });

  it("verlangt bei eingeschränkten Dokumenten Kategorie- und Rollenfreigabe", () => {
    const documentContext: AuthorizationContext = {
      ...context,
      documentAccess: [{ categoryId: "wissen", canView: true, canCreate: false, canEdit: false, canManage: false }],
    };
    expect(canViewInternalDocument(documentContext, { categoryId: "wissen", accessMode: "CATEGORY" })).toBe(true);
    expect(canViewInternalDocument(documentContext, {
      categoryId: "wissen",
      accessMode: "RESTRICTED",
      roleAccess: [{ roleId: "role-editorial", canView: true }],
    })).toBe(true);
    expect(canViewInternalDocument(documentContext, {
      categoryId: "wissen",
      accessMode: "RESTRICTED",
      roleAccess: [{ roleId: "role-admin", canView: true }],
    })).toBe(false);
    expect(canViewInternalDocument(context, {
      categoryId: "wissen",
      accessMode: "RESTRICTED",
      roleAccess: [{ roleId: "role-editorial", canView: true }],
    })).toBe(false);
  });

  it("erlaubt nur definierte Ticketübergänge", () => {
    expect(canTransitionTicket("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionTicket("OPEN", "RESOLVED")).toBe(false);
    expect(canTransitionTicket("CLOSED", "IN_PROGRESS")).toBe(false);
  });
});
