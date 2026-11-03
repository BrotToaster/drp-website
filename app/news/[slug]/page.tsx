import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaGallery } from "@/components/media-gallery";
import { RichContent } from "@/components/rich-content";
import { getPublishedNews } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/site";
import { ContentImage } from "@/components/content-image";
import { publicMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getPublishedNews()).find(item => item.slug === slug);
  return post ? publicMetadata(post.title, post.excerpt, `/news/${post.slug}`) : { title: "Beitrag nicht gefunden", robots: { index: false } };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getPublishedNews()).find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <article className="pb-24">
      <header className="relative overflow-hidden border-b border-[var(--line)]">
        {post.thumbnailUrl && (
          <>
            <ContentImage src={post.thumbnailUrl} alt="" fill sizes="100vw" className="object-cover opacity-25 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#090b0d]/70 to-[#090b0d]" />
          </>
        )}
        <div className="container-shell relative max-w-5xl py-14 md:py-24">
          <Link href="/news" className="text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--accent-ink)]">← Zurück zu allen News</Link>
          <span className="badge badge-gold mt-12 block w-fit">{post.coverLabel || "News"}</span>
          <h1 className="page-title mt-6 max-w-4xl">{post.title}</h1>
          <p className="body-large mt-5 max-w-3xl">{post.excerpt}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
            <time>{formatDate(post.publishedAt)}</time>
            {post.editedAt && <span className="rounded-full border border-[var(--accent-line)] px-3 py-1 text-[var(--accent-ink)]">Bearbeitet am {formatDateTime(post.editedAt)}</span>}
          </div>
        </div>
      </header>

      <div className="container-shell max-w-5xl">
        {post.thumbnailUrl && (
          <div className="-mt-4 pt-12 md:-mt-10">
            <ContentImage src={post.thumbnailUrl} alt={"Titelbild zu " + post.title} width={1200} height={675} className="h-auto max-h-[560px] w-full rounded-[22px] border border-[var(--line)] object-cover shadow-2xl shadow-black/30" />
          </div>
        )}
        <div className="mx-auto max-w-4xl py-14 md:py-20">
          <section className="content-surface" aria-label="Beitragsinhalt">
            <RichContent content={post.content} />
          </section>
          {post.media.length > 0 && (
            <section className="content-surface mt-6" aria-label="Medien zum Beitrag">
              <h2 className="text-lg font-semibold">Medien</h2>
              <MediaGallery media={post.media} />
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
