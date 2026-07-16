import type { Role, TicketStatus } from "@prisma/client";

const roleRank: Record<Role, number> = {
  PLAYER: 0,
  SUPPORTER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasMinimumRole(current: Role, required: Role) {
  return roleRank[current] >= roleRank[required];
}

export function isStaff(role: Role) {
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
