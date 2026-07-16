import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { getPublishedNews } from "@/lib/data";
import { formatDate } from "@/lib/site";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getPublishedNews();
  return (
    <>
      <PageIntro eyebrow="DRP Journal" title="Was Liberty County bewegt." copy="Updates, Community-Neuigkeiten und Einblicke aus unserem Serveralltag." />
      <section className="section-space">
        <div className="container-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {news.map((post, index) => (
            <Link key={post.id} href={"/news/" + post.slug} className="surface surface-interactive overflow-hidden">
              <div className={"flex h-44 items-end border-b border-white/[0.07] p-6 " + (index === 0 ? "bg-[#d6aa4c]/10 md:col-span-1" : "bg-white/[0.02]")}>
                <span className="badge badge-gold">{post.coverLabel || "News"}</span>
              </div>
              <div className="p-6">
                <time className="text-xs text-[#73797d]">{formatDate(post.publishedAt)}</time>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">{post.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#90969a]">{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
