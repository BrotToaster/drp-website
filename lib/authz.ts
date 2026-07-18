import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { PermissionKey } from "@/lib/permission-keys";
import type { AuthorizationContext, TicketAccess } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureBaseRoleAssignments } from "@/lib/role-assignments";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.registrationCompleted && session.user.id !== "demo-owner") {
    redirect("/registrieren");
  }
  return session.user;
}

export async function ensureDbUser() {
  const sessionUser = await requireUser();
  const user = await prisma.user.upsert({
    where: { id: sessionUser.id },
    update: {
      name: sessionUser.name || "DRP Mitglied",
      email: null,
      avatar: sessionUser.image,
    },
    create: {
      id: sessionUser.id,
      name: sessionUser.name || "DRP Mitglied",
      email: null,
      avatar: sessionUser.image,
      registrationCompleted:
        sessionUser.registrationCompleted || sessionUser.id === "demo-owner",
    },
  });
  await ensureBaseRoleAssignments(prisma, user.id, user.discordId);
  return user;
}

export async function getAuthorizationContext(userId: string): Promise<AuthorizationContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleAssignments: {
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
              ticketAccesses: true,
            },
          },
        },
        orderBy: { role: { priority: "desc" } },
      },
    },
  });
  if (!user) {
    return {
      userId,
      roleNames: [],
      primaryRole: "Player",
      permissions: [],
      ticketAccess: [],
      isOwner: userId === "demo-owner",
    };
  }

  const isOwner =
    user.id === "demo-owner" ||
    Boolean(user.discordId && user.discordId === process.env.OWNER_DISCORD_ID);
  const permissionSet = new Set<PermissionKey>();
  const categoryAccess = new Map<string, TicketAccess>();

  for (const assignment of user.roleAssignments) {
    for (const item of assignment.role.permissions) {
      permissionSet.add(item.permission.key as PermissionKey);
    }
    for (const access of assignment.role.ticketAccesses) {
      const current = categoryAccess.get(access.categoryId);
      categoryAccess.set(access.categoryId, {
        categoryId: access.categoryId,
        canView: Boolean(current?.canView || access.canView),
        canReply: Boolean(current?.canReply || access.canReply),
        canAssign: Boolean(current?.canAssign || access.canAssign),
        canStatus: Boolean(current?.canStatus || access.canStatus),
        canDelete: Boolean(current?.canDelete || access.canDelete),
      });
    }
  }

  const roleNames = Array.from(
    new Set(user.roleAssignments.map((assignment) => assignment.role.name)),
  );
  return {
    userId,
    roleNames,
    primaryRole: roleNames[0] || "Player",
    permissions: Array.from(permissionSet),
    ticketAccess: Array.from(categoryAccess.values()),
    isOwner,
  };
}

export async function requirePermission(permission: PermissionKey) {
  const sessionUser = await requireUser();
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  if (!hasPermission(authorization, permission)) redirect("/dashboard");
  return { sessionUser, user, authorization };
}

export async function requireAnyPermission(permissions: PermissionKey[]) {
  const sessionUser = await requireUser();
  const user = await ensureDbUser();
  const authorization = await getAuthorizationContext(user.id);
  if (!permissions.some((permission) => hasPermission(authorization, permission))) {
    redirect("/dashboard");
  }
  return { sessionUser, user, authorization };
}