import { publicMetadata } from "@/lib/metadata";
import { NewsCard } from "@/components/news-card";
import { PageIntro } from "@/components/ui";
import { getPublishedNews } from "@/lib/data";

export const metadata = publicMetadata("News", "Neuigkeiten, Serverupdates und Ankündigungen aus der DRP-Community.", "/news");
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getPublishedNews();
  return (
    <>
      <PageIntro eyebrow="DRP Journal" title="Was neu bei DRP ist." copy="Updates, Community-Neuigkeiten und Einblicke aus unserem Serveralltag." />
      <section className="section-space">
        <div className="container-shell grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-intro="news">
          {news.map((post) => <NewsCard key={post.id} post={post} />)}
        </div>
      </section>
    </>
  );
}
