import type { JSONContent } from "@tiptap/react";
import { contentNodeSchema } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import {
  demoNews,
  demoRules,
  demoTeam,
  type NewsView,
  type RuleView,
  type TeamView,
} from "@/lib/demo-data";

function content(value: unknown): JSONContent {
  const parsed = contentNodeSchema.safeParse(value);
  return parsed.success ? parsed.data : { type: "doc", content: [{ type: "paragraph" }] };
}

export async function getPublishedRules(): Promise<RuleView[]> {
  try {
    const rules = await prisma.rule.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      include: {
        revisions: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          include: {
            media: { orderBy: { sortOrder: "asc" }, include: { media: true } },
          },
        },
      },
    });
    return rules
      .filter((rule) => rule.revisions[0])
      .map((rule) => ({
        id: rule.id,
        slug: rule.slug,
        category: rule.category,
        title: rule.title,
        content: content(rule.revisions[0].content),
        searchText: rule.revisions[0].searchText,
        order: rule.order,
        version: rule.version,
        updatedAt: rule.revisions[0].updatedAt,
        media: rule.revisions[0].media.map((item) => ({
          id: item.media.id,
          url: item.media.secureUrl,
          kind: item.media.kind,
          name: item.media.originalName,
          caption: item.caption,
        })),
      }));
  } catch {
    return demoRules;
  }
}

export async function getPublishedNews(): Promise<NewsView[]> {
  try {
    const posts = await prisma.newsPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      include: {
        thumbnail: { select: { secureUrl: true } },
        revisions: {
          where: { status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          take: 1,
          include: {
            media: { orderBy: { sortOrder: "asc" }, include: { media: true } },
          },
        },
      },
    });
    return posts
      .filter((post) => post.revisions[0])
      .map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: content(post.revisions[0].content),
        coverLabel: post.coverLabel,
        publishedAt: post.publishedAt || new Date(),
        editedAt: post.editedAt,
        thumbnailUrl: post.thumbnail?.secureUrl || null,
        media: post.revisions[0].media.map((item) => ({
          id: item.media.id,
          url: item.media.secureUrl,
          kind: item.media.kind,
          name: item.media.originalName,
          caption: item.caption,
        })),
      }));
  } catch {
    return demoNews;
  }
}

export async function getPublicTeam(): Promise<TeamView[]> {
  try {
    const profiles = await prisma.staffProfile.findMany({
      where: { visible: true },
      orderBy: { displayOrder: "asc" },
      include: { user: { select: { id: true, name: true, avatar: true } }, image: { select: { secureUrl: true } } },
    });
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.displayName || profile.user?.name || "DRP Team",
      title: profile.title,
      department: profile.department,
      bio: profile.bio,
      avatar: profile.image?.secureUrl || profile.user?.avatar || null,
    }));
  } catch {
    return demoTeam;
  }
}