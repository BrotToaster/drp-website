import { z } from "zod";
import { contentNodeSchema } from "@/lib/content";

export const ticketSchema = z.object({
  subject: z.string().trim().min(5).max(100),
  category: z.enum(["CONTACT", "TECHNICAL"]),
  message: z.string().trim().min(20).max(4000),
});

export const ticketMessageSchema = z.object({
  ticketId: z.string().min(1).max(64),
  content: z.string().trim().min(2).max(4000),
});

export const ticketStatusSchema = z.object({
  ticketId: z.string().min(1).max(64),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]),
  expectedStatus: z.enum(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"]),
});

export const ruleEditorSchema = z.object({
  ruleId: z.string().max(64).optional(),
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(3).max(80),
  order: z.number().int().min(0).max(10000),
  content: contentNodeSchema,
  mediaIds: z.array(z.string().min(1).max(64)).max(20).default([]),
});

export const newsEditorSchema = z.object({
  postId: z.string().max(64).optional(),
  title: z.string().trim().min(4).max(160),
  excerpt: z.string().trim().min(20).max(320),
  coverLabel: z.string().trim().max(40).optional(),
  content: contentNodeSchema,
  thumbnailId: z.string().max(64).optional(),
  mediaIds: z.array(z.string().min(1).max(64)).max(20).default([]),
});

export const discordRoleSyncSchema = z.object({
  guildId: z.string().min(1).max(32),
  externalId: z.string().min(1).max(100),
  roles: z.array(
    z.object({
      id: z.string().min(1).max(32),
      name: z.string().min(1).max(100),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      position: z.number().int(),
      managed: z.boolean().optional().default(false),
    }),
  ).max(500),
});

export const discordMemberSchema = z.object({
  id: z.string().min(1).max(32),
  username: z.string().min(1).max(100),
  displayName: z.string().max(100).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  roleIds: z.array(z.string().min(1).max(32)).max(250),
});

export const discordMemberSyncSchema = z.object({
  guildId: z.string().min(1).max(32),
  externalId: z.string().min(1).max(100),
  members: z.array(discordMemberSchema).min(1).max(1000),
});