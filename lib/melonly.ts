import { prisma } from "@/lib/prisma";

type UnknownRecord = Record<string, unknown>;
type Page<T> = { data: T[]; totalPages?: number; page?: number };

const BASE_URL = process.env.MELONLY_API_BASE_URL || "https://api.melonly.xyz/api/v1";

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(input: UnknownRecord, ...keys: string[]) {
  for (const key of keys) if (typeof input[key] === "string" && input[key]) return input[key] as string;
  return undefined;
}

function number(input: UnknownRecord, ...keys: string[]) {
  for (const key of keys) if (typeof input[key] === "number" && Number.isFinite(input[key])) return input[key] as number;
  return undefined;
}

function dateFromEpoch(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value > 10_000_000_000 ? value : value * 1000);
}

async function melonlyRequest(path: string, page = 1): Promise<Page<UnknownRecord>> {
  const token = process.env.MELONLY_API_TOKEN;
  if (!token) throw new Error("MELONLY_API_TOKEN fehlt.");
  const url = new URL(`${BASE_URL.replace(/\/$/, "")}${path}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "100");
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    const retry = response.headers.get("retry-after");
    throw new Error(`Melonly antwortete mit HTTP ${response.status}${retry ? ` (Retry-After: ${retry})` : ""}.`);
  }
  const body = record(await response.json());
  return { data: Array.isArray(body.data) ? body.data.map(record) : [], page: number(body, "page"), totalPages: number(body, "totalPages") };
}

async function allPages(path: string) {
  const result: UnknownRecord[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const response = await melonlyRequest(path, page);
    result.push(...response.data);
    if (!response.totalPages || page >= response.totalPages) break;
  }
  return result;
}

function rolesOf(member: UnknownRecord) {
  const raw = member.roles;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => typeof item === "string" ? item : text(record(item), "id", "roleId")).filter((item): item is string => Boolean(item));
}

export async function syncMelonlyData() {
  const syncedAt = new Date();
  const [roleRows, memberRows, shiftRows, leaveRows] = await Promise.all([
    allPages("/server/roles"),
    allPages("/server/members"),
    allPages("/server/shifts"),
    allPages("/server/loas"),
  ]);
  const roleIds = new Map<string, string>();
  for (const [index, row] of roleRows.entries()) {
    const externalId = text(row, "id", "roleId");
    if (!externalId) continue;
    const role = await prisma.melonlyRole.upsert({
      where: { externalId },
      update: { name: text(row, "name", "title") || externalId, position: number(row, "position", "rank") ?? index, active: true, lastSyncedAt: syncedAt },
      create: { externalId, name: text(row, "name", "title") || externalId, position: number(row, "position", "rank") ?? index, lastSyncedAt: syncedAt },
    });
    roleIds.set(externalId, role.id);
  }
  await prisma.melonlyRole.updateMany({ where: { lastSyncedAt: { lt: syncedAt } }, data: { active: false } });
  const roles = await prisma.melonlyRole.findMany();
  const roleByExternal = new Map(roles.map((role) => [role.externalId, role]));

  const memberIds = new Map<string, string>();
  for (const row of memberRows) {
    const externalId = text(row, "id", "memberId");
    if (!externalId) continue;
    const existingMember = await prisma.melonlyMember.findUnique({ where: { externalId } });
    const discordId = text(row, "discordId", "discordUserId") || existingMember?.discordId || undefined;
    const robloxUserId = text(row, "robloxId", "robloxUserId") || existingMember?.robloxUserId || undefined;
    const role = rolesOf(row).map((id) => roleByExternal.get(id)).filter((item): item is typeof roles[number] => Boolean(item)).sort((a, b) => b.position - a.position)[0];
    const linkedUser = discordId ? await prisma.user.findUnique({ where: { discordId }, select: { id: true, discordDisplayName: true, discordUsername: true } }) : robloxUserId ? await prisma.user.findUnique({ where: { robloxUserId }, select: { id: true, discordDisplayName: true, discordUsername: true } }) : existingMember?.userId ? await prisma.user.findUnique({ where: { id: existingMember.userId }, select: { id: true, discordDisplayName: true, discordUsername: true } }) : null;
    const displayName = text(row, "displayName", "username", "name") || linkedUser?.discordDisplayName || linkedUser?.discordUsername || discordId || externalId;
    const member = await prisma.melonlyMember.upsert({
      where: { externalId },
      update: { discordId: discordId || null, robloxUserId: robloxUserId || null, displayName, roleId: role?.id || null, userId: linkedUser?.id || null, active: true, joinedAt: dateFromEpoch(number(row, "createdAt", "joinedAt")), lastSyncedAt: syncedAt },
      create: { externalId, discordId: discordId || null, robloxUserId: robloxUserId || null, displayName, roleId: role?.id || null, userId: linkedUser?.id || null, joinedAt: dateFromEpoch(number(row, "createdAt", "joinedAt")), lastSyncedAt: syncedAt },
    });
    memberIds.set(externalId, member.id);
  }
  await prisma.melonlyMember.updateMany({ where: { lastSyncedAt: { lt: syncedAt } }, data: { active: false } });

  let shifts = 0;
  for (const row of shiftRows) {
    const externalId = text(row, "id", "shiftId");
    const memberId = memberIds.get(text(row, "memberId", "userId") || "");
    const startsAt = dateFromEpoch(number(row, "startedAt", "createdAt", "startAt"));
    if (!externalId || !memberId || !startsAt) continue;
    const endsAt = dateFromEpoch(number(row, "endedAt", "endAt"));
    const givenMinutes = number(row, "durationMinutes", "minutes");
    const durationMinutes = givenMinutes ?? (endsAt ? Math.max(0, Math.floor((endsAt.getTime() - startsAt.getTime()) / 60_000)) : 0);
    await prisma.melonlyShift.upsert({ where: { externalId }, update: { memberId, startsAt, endsAt, durationMinutes, lastSyncedAt: syncedAt }, create: { externalId, memberId, startsAt, endsAt, durationMinutes, lastSyncedAt: syncedAt } });
    shifts += 1;
  }

  let leaves = 0;
  for (const row of leaveRows) {
    const externalId = text(row, "id", "loaId");
    const memberId = memberIds.get(text(row, "memberId", "userId") || "");
    const startsOn = dateFromEpoch(number(row, "startAt", "startedAt"));
    const endsOn = dateFromEpoch(number(row, "endAt", "endedAt", "expiredAt"));
    if (!externalId || !memberId || !startsOn || !endsOn) continue;
    const statusRaw = row.status;
    const status = typeof statusRaw === "string" ? statusRaw : String(statusRaw ?? "unknown");
    const denied = Boolean(text(row, "denyReason")) || Boolean(dateFromEpoch(number(row, "cancelledAt")));
    const approved = !denied && (Boolean(dateFromEpoch(number(row, "reviewedAt", "startedAt"))) || ["approved", "active", "ended", "expired", "2", "3", "4"].includes(status.toLocaleLowerCase("en")));
    await prisma.melonlyLeave.upsert({ where: { externalId }, update: { memberId, startsOn, endsOn, status, approved, lastSyncedAt: syncedAt }, create: { externalId, memberId, startsOn, endsOn, status, approved, lastSyncedAt: syncedAt } });
    leaves += 1;
  }
  return { roles: roleIds.size, members: memberIds.size, shifts, leaves, syncedAt };
}

export function melonlyConfigured() {
  return Boolean(process.env.MELONLY_API_TOKEN);
}
