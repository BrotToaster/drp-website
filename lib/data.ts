import { prisma } from "@/lib/prisma";
import { demoNews, demoRules, demoTeam, type NewsView, type RuleView, type TeamView } from "@/lib/demo-data";

export async function getPublishedRules(): Promise<RuleView[]> {
  try {
    return await prisma.rule.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, category: true, title: true, content: true, order: true, version: true },
    });
  } catch {
    return demoRules;
  }
}

export async function getPublishedNews(): Promise<NewsView[]> {
  try {
    const posts = await prisma.newsPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverLabel: true,
        publishedAt: true,
      },
    });
    return posts.map((post) => ({ ...post, publishedAt: post.publishedAt || new Date() }));
  } catch {
    return demoNews;
  }
}

export async function getPublicTeam(): Promise<TeamView[]> {
  try {
    const profiles = await prisma.staffProfile.findMany({
      where: { visible: true },
      orderBy: { displayOrder: "asc" },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.user.name,
      title: profile.title,
      department: profile.department,
      bio: profile.bio,
      avatar: profile.user.avatar,
    }));
  } catch {
    return demoTeam;
  }
}
