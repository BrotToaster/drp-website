import { z } from "zod";

export const profileSchema = z.object({
  robloxName: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
  robloxUserId: z.string().trim().regex(/^\d+$/).optional().or(z.literal("")),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(5).max(100),
  category: z.enum(["SUPPORT", "REPORT", "APPEAL", "TECHNICAL"]),
  message: z.string().trim().min(20).max(4000),
});

export const ticketMessageSchema = z.object({
  ticketId: z.string().cuid(),
  content: z.string().trim().min(2).max(4000),
});

export const applicationSchema = z.object({
  motivation: z.string().trim().min(80).max(4000),
  experience: z.string().trim().min(40).max(3000),
  scenario: z.string().trim().min(80).max(4000),
});

export const sanctionSchema = z.object({
  robloxName: z.string().trim().min(3).max(20),
  robloxUserId: z.string().trim().optional(),
  type: z.enum(["WARNING", "BAN"]),
  reason: z.string().trim().min(10).max(2000),
  evidenceUrl: z.string().url().optional().or(z.literal("")),
  expiresAt: z.string().optional(),
});

export const ruleSchema = z.object({
  title: z.string().trim().min(3).max(100),
  category: z.string().trim().min(3).max(50),
  content: z.string().trim().min(20).max(8000),
});

export const newsSchema = z.object({
  title: z.string().trim().min(4).max(120),
  excerpt: z.string().trim().min(20).max(240),
  content: z.string().trim().min(40).max(10000),
  coverLabel: z.string().trim().max(30).optional(),
});
