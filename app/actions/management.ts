"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const text = (formData: FormData, key: string) => String(formData.get(key) || "").trim();

const faqSchema = z.object({
  id: z.string().optional(),
  category: z.string().min(2).max(80),
  question: z.string().min(5).max(240),
  answer: z.string().min(10).max(4000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  visible: z.boolean(),
});

export async function saveFaqAction(formData: FormData) {
  const { user } = await requirePermission("faq.manage");
  const parsed = faqSchema.safeParse({
    id: text(formData, "id") || undefined,
    category: text(formData, "category"),
    question: text(formData, "question"),
    answer: text(formData, "answer"),
    sortOrder: text(formData, "sortOrder"),
    visible: formData.get("visible") === "on",
  });
  if (!parsed.success) redirect("/staff/faq?error=invalid");
  const item = await prisma.$transaction(async (tx) => {
    const saved = parsed.data.id
      ? await tx.faqItem.update({
          where: { id: parsed.data.id },
          data: { ...parsed.data, id: undefined, editorId: user.id },
        })
      : await tx.faqItem.create({
          data: {
            category: parsed.data.category,
            question: parsed.data.question,
            answer: parsed.data.answer,
            sortOrder: parsed.data.sortOrder,
            visible: parsed.data.visible,
            editorId: user.id,
          },
        });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: parsed.data.id ? "FAQ_UPDATED" : "FAQ_CREATED",
        entityType: "FaqItem",
        entityId: saved.id,
      },
    });
    return saved;
  });
  revalidatePath("/faq");
  revalidatePath("/staff/faq");
  redirect("/staff/faq?saved=" + item.id);
}

export async function deleteFaqAction(formData: FormData) {
  const { user } = await requirePermission("faq.manage");
  const id = text(formData, "id");
  await prisma.$transaction([
    prisma.faqItem.delete({ where: { id } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: "FAQ_DELETED", entityType: "FaqItem", entityId: id } }),
  ]);
  revalidatePath("/faq");
  revalidatePath("/staff/faq");
}

const teamSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  displayName: z.string().min(2).max(100),
  title: z.string().min(2).max(120),
  department: z.string().min(2).max(120),
  bio: z.string().max(1500).optional(),
  displayOrder: z.coerce.number().int().min(0).max(10000),
  imageId: z.string().optional(),
  visible: z.boolean(),
});

export async function saveTeamMemberAction(formData: FormData) {
  const { user } = await requirePermission("team.manage");
  const parsed = teamSchema.safeParse({
    id: text(formData, "id") || undefined,
    userId: text(formData, "userId") || undefined,
    displayName: text(formData, "displayName"),
    title: text(formData, "title"),
    department: text(formData, "department"),
    bio: text(formData, "bio") || undefined,
    displayOrder: text(formData, "displayOrder"),
    imageId: text(formData, "imageId") || undefined,
    visible: formData.get("visible") === "on",
  });
  if (!parsed.success) redirect("/admin/team?error=invalid");
  const { id, userId, imageId, bio, ...values } = parsed.data;
  if (userId) {
    const linked = await prisma.staffProfile.findFirst({
      where: { userId, ...(id ? { id: { not: id } } : {}) },
    });
    if (linked) redirect("/admin/team?error=user-linked");
  }
  if (imageId) {
    const image = await prisma.mediaAsset.findUnique({ where: { id: imageId }, select: { kind: true } });
    if (image?.kind !== "IMAGE") redirect("/admin/team?error=image");
  }
  const saved = await prisma.$transaction(async (tx) => {
    const profile = id
      ? await tx.staffProfile.update({
          where: { id },
          data: { ...values, userId: userId || null, imageId: imageId || null, bio: bio || null },
        })
      : await tx.staffProfile.create({
          data: { ...values, userId: userId || null, imageId: imageId || null, bio: bio || null },
        });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: id ? "TEAM_MEMBER_UPDATED" : "TEAM_MEMBER_CREATED",
        entityType: "StaffProfile",
        entityId: profile.id,
      },
    });
    return profile;
  });
  revalidatePath("/team");
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=" + saved.id);
}

export async function deleteTeamMemberAction(formData: FormData) {
  const { user } = await requirePermission("team.manage");
  const id = text(formData, "id");
  await prisma.$transaction([
    prisma.staffProfile.delete({ where: { id } }),
    prisma.auditLog.create({ data: { actorId: user.id, action: "TEAM_MEMBER_DELETED", entityType: "StaffProfile", entityId: id } }),
  ]);
  revalidatePath("/team");
  revalidatePath("/admin/team");
}
