"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { allPermissionKeys } from "@/lib/permission-keys";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function keyify(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export async function saveAccessRoleAction(formData: FormData) {
  const { user: actor } = await requirePermission("roles.manage");
  const roleId = value(formData, "roleId");
  const name = value(formData, "name");
  const description = value(formData, "description");
  const color = value(formData, "color");
  const priority = Number(value(formData, "priority"));
  if (name.length < 2 || !/^#[0-9a-fA-F]{6}$/.test(color) || !Number.isInteger(priority)) {
    redirect("/admin/rollen?error=invalid");
  }

  const role = roleId
    ? await prisma.accessRole.update({
        where: { id: roleId },
        data: { name, description: description || null, color, priority },
      })
    : await prisma.accessRole.create({
        data: {
          key: keyify(name) + "_" + Date.now().toString(36).toUpperCase(),
          name,
          description: description || null,
          color,
          priority,
        },
      });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: roleId ? "ACCESS_ROLE_UPDATED" : "ACCESS_ROLE_CREATED",
      entityType: "AccessRole",
      entityId: role.id,
    },
  });
  revalidatePath("/admin/rollen");
  revalidatePath("/staff");
  redirect("/admin/rollen?saved=role");
}

export async function saveRolePermissionsAction(formData: FormData) {
  const { user: actor } = await requirePermission("roles.manage");
  const roleId = value(formData, "roleId");
  const role = await prisma.accessRole.findUnique({ where: { id: roleId } });
  if (!role) redirect("/admin/rollen?error=role");

  const requested = role.key === "OWNER"
    ? allPermissionKeys
    : formData.getAll("permissionKeys").map(String);
  const permissions = await prisma.permission.findMany({
    where: { key: { in: requested } },
  });
  if (permissions.length !== requested.length) redirect("/admin/rollen?error=permission");

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    await tx.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ROLE_PERMISSIONS_UPDATED",
        entityType: "AccessRole",
        entityId: roleId,
        metadata: { permissions: requested },
      },
    });
  });
  revalidatePath("/admin/rollen");
  redirect("/admin/rollen?saved=permissions");
}

export async function saveDiscordRoleMappingAction(formData: FormData) {
  const { user: actor } = await requirePermission("discord.manage");
  const discordRoleId = value(formData, "discordRoleId");
  const accessRoleId = value(formData, "accessRoleId");
  const active = formData.get("active") === "on";
  if (!discordRoleId || !accessRoleId) redirect("/admin/discord?error=mapping");
  await prisma.$transaction(async (tx) => {
    await tx.discordRoleMapping.upsert({
      where: { discordRoleId_accessRoleId: { discordRoleId, accessRoleId } },
      update: { active },
      create: { discordRoleId, accessRoleId, active },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "DISCORD_ROLE_MAPPING_UPDATED",
        entityType: "DiscordRoleMapping",
        entityId: discordRoleId,
        metadata: { accessRoleId, active },
      },
    });
  });
  revalidatePath("/admin/discord");
}

export async function saveTicketAccessAction(formData: FormData) {
  const { user: actor } = await requirePermission("tickets.manage_categories");
  const roleId = value(formData, "roleId");
  const categoryId = value(formData, "categoryId");
  const data = {
    canView: formData.get("canView") === "on",
    canReply: formData.get("canReply") === "on",
    canAssign: formData.get("canAssign") === "on",
    canStatus: formData.get("canStatus") === "on",
    canDelete: formData.get("canDelete") === "on",
  };
  await prisma.$transaction(async (tx) => {
    await tx.roleTicketCategoryAccess.upsert({
      where: { roleId_categoryId: { roleId, categoryId } },
      update: data,
      create: { roleId, categoryId, ...data },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TICKET_CATEGORY_ACCESS_UPDATED",
        entityType: "TicketCategory",
        entityId: categoryId,
        metadata: { roleId, ...data },
      },
    });
  });
  revalidatePath("/admin/tickets");
  revalidatePath("/staff/tickets");
}

export async function saveTicketCategoryAction(formData: FormData) {
  const { user: actor } = await requirePermission("tickets.manage_categories");
  const categoryId = value(formData, "categoryId");
  const label = value(formData, "label");
  const description = value(formData, "description");
  const enabled = formData.get("enabled") === "on";
  const sortOrder = Number(value(formData, "sortOrder"));
  await prisma.$transaction([
    prisma.ticketCategory.update({
      where: { id: categoryId },
      data: { label, description: description || null, enabled, sortOrder },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TICKET_CATEGORY_UPDATED",
        entityType: "TicketCategory",
        entityId: categoryId,
      },
    }),
  ]);
  revalidatePath("/admin/tickets");
  revalidatePath("/dashboard/tickets");
  revalidatePath("/staff/tickets");
}

export async function saveSiteSettingsAction(formData: FormData) {
  const { user: actor } = await requirePermission("site.manage");
  const departments = [
    {
      code: "POLIZEI",
      name: value(formData, "policeName"),
      copy: value(formData, "policeCopy"),
    },
    {
      code: "FEUERWEHR",
      name: value(formData, "fireName"),
      copy: value(formData, "fireCopy"),
    },
    {
      code: "MOVEBERLIN",
      name: value(formData, "moveName"),
      copy: value(formData, "moveCopy"),
    },
  ];
  const links = {
    discordUrl: value(formData, "discordUrl"),
    robloxUrl: value(formData, "robloxUrl"),
  };
  await prisma.$transaction([
    prisma.siteSetting.upsert({
      where: { key: "homepage.departments" },
      update: { value: departments },
      create: { key: "homepage.departments", value: departments },
    }),
    prisma.siteSetting.upsert({
      where: { key: "public.links" },
      update: { value: links },
      create: { key: "public.links", value: links },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "SITE_SETTINGS_UPDATED",
        entityType: "SiteSetting",
        entityId: "homepage",
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/website");
  redirect("/admin/website?saved=1");
}