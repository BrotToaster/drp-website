"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { syncMelonlyData } from "@/lib/melonly";
import { prisma } from "@/lib/prisma";
import { applyWeeklyResult, generateWeeklyTeamReview } from "@/lib/team-workflow";

const value = (formData: FormData, key: string) => String(formData.get(key) || "").trim();
function refresh() { revalidatePath("/staff/aktivitaet"); revalidatePath("/admin/melonly"); }

export async function syncMelonlyAction(_previous: ActionResult, _formData: FormData): Promise<ActionResult> {
  void _previous;
  void _formData;
  try {
    const { user } = await requirePermission("melonly.manage");
    const result = await syncMelonlyData();
    await prisma.auditLog.create({ data: { actorId: user.id, action: "MELONLY_SYNCED", entityType: "Melonly", entityId: "primary", metadata: result } });
    refresh();
    return { ok: true, message: `Melonly synchronisiert: ${result.members} Mitglieder, ${result.shifts} Schichten und ${result.leaves} LoAs.` };
  } catch (error) {
    return { ok: false, code: "SERVER", message: error instanceof Error ? error.message : "Melonly konnte nicht synchronisiert werden." };
  }
}

export async function generateWeeklyReviewAction(_previous: ActionResult, _formData: FormData): Promise<ActionResult> {
  void _previous;
  void _formData;
  try {
    const { user } = await requirePermission("team_activity.review");
    const result = await generateWeeklyTeamReview();
    await prisma.auditLog.create({ data: { actorId: user.id, action: "TEAM_WEEKLY_REVIEW_GENERATED", entityType: "TeamWeeklyReview", entityId: result.reviewId, metadata: { count: result.count } } });
    refresh();
    return { ok: true, message: `Wochenauswertung für ${result.count} Teammitglieder wurde erstellt.` };
  } catch (error) {
    return { ok: false, code: "SERVER", message: error instanceof Error ? error.message : "Wochenauswertung konnte nicht erstellt werden." };
  }
}

export async function decideWeeklyResultAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const decision = value(formData, "decision") === "reject" ? "reject" : "apply";
    const result = await applyWeeklyResult(value(formData, "resultId"), user.id, decision, value(formData, "notes").slice(0, 500));
    refresh();
    return { ok: true, message: decision === "reject" ? "Empfehlung wurde verworfen." : `Empfehlung wurde bestätigt. ${result.jobs} Discord-Rollenauftrag/-aufträge warten auf den Bot.` };
  } catch (error) {
    return { ok: false, code: error instanceof Error && error.message === "CONFLICT" ? "CONFLICT" : "SERVER", message: error instanceof Error && error.message === "CONFLICT" ? "Diese Empfehlung wurde bereits bearbeitet." : "Entscheidung konnte nicht gespeichert werden." };
  }
}

export async function saveMelonlyRoleAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("melonly.manage");
    const parsed = z.object({ id: z.string().min(1), weeklyTargetMinutes: z.coerce.number().int().min(0).max(10080), nextRoleId: z.string().optional() }).safeParse({ id: value(formData, "id"), weeklyTargetMinutes: value(formData, "weeklyTargetMinutes"), nextRoleId: value(formData, "nextRoleId") || undefined });
    if (!parsed.success || parsed.data.id === parsed.data.nextRoleId) return { ok: false, code: "VALIDATION", message: "Bitte prüfe Wochenzeit und nächste Rolle." };
    await prisma.$transaction([prisma.melonlyRole.update({ where: { id: parsed.data.id }, data: { weeklyTargetMinutes: parsed.data.weeklyTargetMinutes, nextRoleId: parsed.data.nextRoleId || null } }), prisma.auditLog.create({ data: { actorId: user.id, action: "MELONLY_ROLE_CONFIG_UPDATED", entityType: "MelonlyRole", entityId: parsed.data.id } })]);
    refresh();
    return { ok: true, message: "Melonly-Rollenvorgabe wurde gespeichert." };
  } catch {
    return { ok: false, code: "SERVER", message: "Rollenvorgabe konnte nicht gespeichert werden." };
  }
}

export async function saveDiscordTeamRoleMappingAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("melonly.manage");
    const key = value(formData, "key");
    if (!["STRIKE_1", "STRIKE_2", "STRIKE_3", "UPRANK_BLOCK"].includes(key)) return { ok: false, code: "VALIDATION", message: "Unbekannte Rollenverknüpfung." };
    const discordRoleId = value(formData, "discordRoleId") || null;
    await prisma.$transaction([prisma.discordTeamRoleMapping.upsert({ where: { key }, update: { discordRoleId, enabled: formData.get("enabled") === "on" }, create: { key, discordRoleId, enabled: formData.get("enabled") === "on" } }), prisma.auditLog.create({ data: { actorId: user.id, action: "DISCORD_TEAM_ROLE_MAPPING_UPDATED", entityType: "DiscordTeamRoleMapping", entityId: key, metadata: { discordRoleId } } })]);
    refresh();
    return { ok: true, message: "Discord-Teamrolle wurde verknüpft." };
  } catch {
    return { ok: false, code: "SERVER", message: "Discord-Teamrolle konnte nicht verknüpft werden." };
  }
}

export async function linkMelonlyMemberAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user: actor } = await requirePermission("melonly.manage");
    const memberId = value(formData, "memberId");
    const userId = value(formData, "userId") || null;
    const member = await prisma.melonlyMember.findUnique({ where: { id: memberId } });
    if (!member) return { ok: false, code: "VALIDATION", message: "Melonly-Mitglied wurde nicht gefunden." };
    const target = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (userId && !target) return { ok: false, code: "VALIDATION", message: "Website-Nutzer wurde nicht gefunden." };
    const duplicate = userId ? await prisma.melonlyMember.findFirst({ where: { userId, id: { not: memberId } } }) : null;
    if (duplicate) return { ok: false, code: "CONFLICT", message: "Dieser Website-Nutzer ist bereits einem anderen Melonly-Mitglied zugeordnet." };
    await prisma.$transaction([
      prisma.melonlyMember.update({ where: { id: memberId }, data: target ? { userId: target.id, discordId: target.discordId, robloxUserId: target.robloxUserId, displayName: target.discordDisplayName || target.discordUsername || target.robloxDisplayName || target.robloxName || target.name } : { userId: null, discordId: null, robloxUserId: null } }),
      prisma.auditLog.create({ data: { actorId: actor.id, action: userId ? "MELONLY_MEMBER_LINKED" : "MELONLY_MEMBER_UNLINKED", entityType: "MelonlyMember", entityId: memberId, metadata: { userId } } }),
    ]);
    refresh();
    return { ok: true, message: userId ? "Melonly-Mitglied wurde mit dem Website-Nutzer verknüpft." : "Manuelle Zuordnung wurde entfernt." };
  } catch {
    return { ok: false, code: "SERVER", message: "Melonly-Mitglied konnte nicht zugeordnet werden." };
  }
}
