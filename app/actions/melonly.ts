"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requirePermission } from "@/lib/authz";
import { syncMelonlyData } from "@/lib/melonly";
import { prisma } from "@/lib/prisma";
import { applyWeeklyResult, generateWeeklyTeamReview, rebuildWeeklyReport } from "@/lib/team-workflow";
import { actionSuccess } from "@/lib/action-result";

const value = (formData: FormData, key: string) => String(formData.get(key) || "").trim();
function refresh() { revalidatePath("/staff/aktivitaet"); revalidatePath("/admin/melonly"); }

export async function saveDiscordTeamRankAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.configure");
    const parsed = z.object({ discordRoleId: z.string().min(1), section: z.enum(["ADMINISTRATION", "MODERATION", "CUSTOM"]), shortName: z.string().min(1).max(32), sortOrder: z.coerce.number().int().min(0).max(10000), weeklyTargetMinutes: z.coerce.number().int().min(0).max(10080), nextDiscordRoleId: z.string().optional(), outputLabel: z.string().max(80).optional() }).safeParse({ discordRoleId: value(formData, "discordRoleId"), section: value(formData, "section"), shortName: value(formData, "shortName"), sortOrder: value(formData, "sortOrder"), weeklyTargetMinutes: value(formData, "weeklyTargetMinutes"), nextDiscordRoleId: value(formData, "nextDiscordRoleId") || undefined, outputLabel: value(formData, "outputLabel") || undefined });
    if (!parsed.success || parsed.data.discordRoleId === parsed.data.nextDiscordRoleId) return { ok: false, code: "VALIDATION", message: "Bitte prüfe Discord-Rolle, Rangfolge, Wochenziel und Folgerang." };
    const [role, nextRole] = await Promise.all([prisma.discordRole.findUnique({ where: { id: parsed.data.discordRoleId } }), parsed.data.nextDiscordRoleId ? prisma.discordRole.findUnique({ where: { id: parsed.data.nextDiscordRoleId } }) : null]);
    if (!role || (parsed.data.nextDiscordRoleId && (!nextRole || nextRole.guildId !== role.guildId))) return { ok: false, code: "VALIDATION", message: "Die Discord-Rollen wurden nicht gefunden oder gehören nicht zum selben Server." };
    const rank = await prisma.$transaction(async (tx) => {
      const saved = await tx.discordTeamRank.upsert({ where: { discordRoleId: role.id }, update: { section: parsed.data.section, shortName: parsed.data.shortName, sortOrder: parsed.data.sortOrder, weeklyTargetMinutes: parsed.data.weeklyTargetMinutes, nextDiscordRoleId: parsed.data.nextDiscordRoleId || null, outputLabel: parsed.data.outputLabel || null, active: formData.get("active") === "on" }, create: { discordRoleId: role.id, section: parsed.data.section, shortName: parsed.data.shortName, sortOrder: parsed.data.sortOrder, weeklyTargetMinutes: parsed.data.weeklyTargetMinutes, nextDiscordRoleId: parsed.data.nextDiscordRoleId || null, outputLabel: parsed.data.outputLabel || null, active: formData.get("active") === "on" } });
      await tx.auditLog.create({ data: { actorId: user.id, action: "DISCORD_TEAM_RANK_CONFIGURED", entityType: "DiscordTeamRank", entityId: saved.id, metadata: { discordRoleId: role.discordRoleId, shortName: saved.shortName, section: saved.section } } });
      return saved;
    });
    refresh();
    return actionSuccess(`Discord-Rang ${rank.shortName} wurde gespeichert.`);
  } catch (error) { return { ok: false, code: "SERVER", message: error instanceof Error ? error.message : "Discord-Rang konnte nicht gespeichert werden." }; }
}

export async function deleteDiscordTeamRankAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.configure");
    const id = value(formData, "id");
    await prisma.$transaction([prisma.discordTeamRank.delete({ where: { id } }), prisma.auditLog.create({ data: { actorId: user.id, action: "DISCORD_TEAM_RANK_DELETED", entityType: "DiscordTeamRank", entityId: id } })]);
    refresh();
    return actionSuccess("Discord-Rangkonfiguration wurde entfernt.");
  } catch { return { ok: false, code: "SERVER", message: "Discord-Rangkonfiguration konnte nicht entfernt werden." }; }
}

export async function saveWeeklyEntryAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const parsed = z.object({ id: z.string().optional(), reviewId: z.string().min(1), kind: z.enum(["UPRANK", "LOA", "STRIKE", "BLOCKED", "REMOVAL", "MANUAL"]), section: z.enum(["ADMINISTRATION", "MODERATION", "LOA", "STRIKES", "CUSTOM"]), discordId: z.string().regex(/^\d+$/).optional(), displayName: z.string().max(100).optional(), fromLabel: z.string().max(40).optional(), toLabel: z.string().max(80).optional(), text: z.string().max(240).optional(), sortOrder: z.coerce.number().int().min(0).max(10000) }).safeParse({ id: value(formData, "id") || undefined, reviewId: value(formData, "reviewId"), kind: value(formData, "kind"), section: value(formData, "section"), discordId: value(formData, "discordId") || undefined, displayName: value(formData, "displayName") || undefined, fromLabel: value(formData, "fromLabel") || undefined, toLabel: value(formData, "toLabel") || undefined, text: value(formData, "text") || undefined, sortOrder: value(formData, "sortOrder") || "0" });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte prüfe den Weekly-Eintrag." };
    const snapshot = parsed.data.discordId && !parsed.data.displayName ? await prisma.discordMemberSnapshot.findFirst({ where: { discordId: parsed.data.discordId }, orderBy: { lastSyncedAt: "desc" } }) : null;
    const displayName = parsed.data.displayName || snapshot?.displayName || snapshot?.username;
    if (!displayName) return { ok: false, code: "VALIDATION", message: "Für den Weekly-Eintrag fehlt ein Anzeigename." };
    const data = { reviewId: parsed.data.reviewId, kind: parsed.data.kind, section: parsed.data.section, discordId: parsed.data.discordId || null, displayName, fromLabel: parsed.data.fromLabel || null, toLabel: parsed.data.toLabel || null, text: parsed.data.text || null, sortOrder: parsed.data.sortOrder, automatic: false, included: formData.get("included") === "on" };
    const entry = parsed.data.id ? await prisma.teamWeeklyEntry.update({ where: { id: parsed.data.id }, data }) : await prisma.teamWeeklyEntry.create({ data });
    await rebuildWeeklyReport(parsed.data.reviewId);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "WEEKLY_ENTRY_SAVED", entityType: "TeamWeeklyEntry", entityId: entry.id } });
    refresh();
    return actionSuccess("Weekly-Eintrag wurde gespeichert.");
  } catch (error) { return { ok: false, code: "SERVER", message: error instanceof Error ? error.message : "Weekly-Eintrag konnte nicht gespeichert werden." }; }
}

export async function deleteWeeklyEntryAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const id = value(formData, "id");
    const entry = await prisma.teamWeeklyEntry.delete({ where: { id } });
    await rebuildWeeklyReport(entry.reviewId);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "WEEKLY_ENTRY_DELETED", entityType: "TeamWeeklyEntry", entityId: id } });
    refresh(); return actionSuccess("Weekly-Eintrag wurde entfernt.");
  } catch { return { ok: false, code: "SERVER", message: "Weekly-Eintrag konnte nicht entfernt werden." }; }
}

export async function saveWeeklySignatureAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const parsed = z.object({ reviewId: z.string().min(1), discordId: z.string().regex(/^\d+$/), label: z.string().min(1).max(80), sortOrder: z.coerce.number().int().min(0).max(1000) }).safeParse({ reviewId: value(formData, "reviewId"), discordId: value(formData, "discordId"), label: value(formData, "label"), sortOrder: value(formData, "sortOrder") || "0" });
    if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Bitte wähle Discord-Nutzer und Unterschriftslabel." };
    const snapshot = await prisma.discordMemberSnapshot.findFirst({ where: { discordId: parsed.data.discordId }, orderBy: { lastSyncedAt: "desc" } });
    if (!snapshot) return { ok: false, code: "VALIDATION", message: "Discord-Nutzer wurde nicht gefunden." };
    const signature = await prisma.teamWeeklySignature.create({ data: { ...parsed.data, displayName: snapshot.displayName || snapshot.username } });
    await rebuildWeeklyReport(parsed.data.reviewId);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "WEEKLY_SIGNATURE_ADDED", entityType: "TeamWeeklySignature", entityId: signature.id } });
    refresh(); return actionSuccess("Unterschrift wurde hinzugefügt.");
  } catch { return { ok: false, code: "SERVER", message: "Unterschrift konnte nicht gespeichert werden." }; }
}

export async function deleteWeeklySignatureAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const signature = await prisma.teamWeeklySignature.delete({ where: { id: value(formData, "id") } });
    await rebuildWeeklyReport(signature.reviewId);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "WEEKLY_SIGNATURE_DELETED", entityType: "TeamWeeklySignature", entityId: signature.id } });
    refresh(); return actionSuccess("Unterschrift wurde entfernt.");
  } catch { return { ok: false, code: "SERVER", message: "Unterschrift konnte nicht entfernt werden." }; }
}

export async function setWeeklyMentionModeAction(_previous: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requirePermission("team_activity.review");
    const reviewId = value(formData, "reviewId");
    const mentionMode = value(formData, "mentionMode") === "PING" ? "PING" : "CODE";
    await prisma.teamWeeklyReview.update({ where: { id: reviewId }, data: { mentionMode } });
    await rebuildWeeklyReport(reviewId);
    await prisma.auditLog.create({ data: { actorId: user.id, action: "WEEKLY_MENTION_MODE_CHANGED", entityType: "TeamWeeklyReview", entityId: reviewId, metadata: { mentionMode } } });
    refresh(); return actionSuccess(mentionMode === "PING" ? "Echte Discord-Pings sind aktiviert." : "Erwähnungen werden grau und ohne Benachrichtigung kopiert.");
  } catch { return { ok: false, code: "SERVER", message: "Mention-Modus konnte nicht gespeichert werden." }; }
}

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
    const linkTarget = value(formData, "linkTarget");
    const userId = (linkTarget.startsWith("user:") ? linkTarget.slice(5) : value(formData, "userId")) || null;
    const directDiscordId = (linkTarget.startsWith("discord:") ? linkTarget.slice(8) : value(formData, "discordId")) || null;
    const member = await prisma.melonlyMember.findUnique({ where: { id: memberId } });
    if (!member) return { ok: false, code: "VALIDATION", message: "Melonly-Mitglied wurde nicht gefunden." };
    const target = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (userId && !target) return { ok: false, code: "VALIDATION", message: "Website-Nutzer wurde nicht gefunden." };
    const discordId = target?.discordId || directDiscordId;
    const snapshot = directDiscordId ? await prisma.discordMemberSnapshot.findFirst({ where: { discordId: directDiscordId }, orderBy: { lastSyncedAt: "desc" } }) : null;
    const duplicate = await prisma.melonlyMember.findFirst({ where: { id: { not: memberId }, OR: [...(userId ? [{ userId }] : []), ...(discordId ? [{ discordId }] : [])] } });
    if (duplicate) return { ok: false, code: "CONFLICT", message: "Dieser Website- oder Discord-Nutzer ist bereits einem anderen Melonly-Mitglied zugeordnet." };
    await prisma.$transaction([
      prisma.melonlyMember.update({ where: { id: memberId }, data: target ? { userId: target.id, discordId: target.discordId, robloxUserId: target.robloxUserId, displayName: target.discordDisplayName || target.discordUsername || target.robloxDisplayName || target.robloxName || target.name } : snapshot ? { userId: null, discordId: snapshot.discordId, robloxUserId: null, displayName: snapshot.displayName || snapshot.username } : { userId: null, discordId: null, robloxUserId: null } }),
      prisma.auditLog.create({ data: { actorId: actor.id, action: userId || directDiscordId ? "MELONLY_MEMBER_LINKED" : "MELONLY_MEMBER_UNLINKED", entityType: "MelonlyMember", entityId: memberId, metadata: { userId, discordId } } }),
    ]);
    refresh();
    return actionSuccess(userId ? "Melonly-Mitglied wurde mit dem Website-Nutzer verknüpft." : directDiscordId ? "Melonly-Mitglied wurde direkt mit Discord verknüpft." : "Manuelle Zuordnung wurde entfernt.");
  } catch {
    return { ok: false, code: "SERVER", message: "Melonly-Mitglied konnte nicht zugeordnet werden." };
  }
}
