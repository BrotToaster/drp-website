import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaGallery } from "@/components/media-gallery";
import { RichContent } from "@/components/rich-content";
import { getPublishedNews } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getPublishedNews()).find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <article className="pb-24">
      <header className="relative overflow-hidden border-b border-white/[0.07]">
        {post.thumbnailUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#090b0d]/70 to-[#090b0d]" />
          </>
        )}
        <div className="container-shell relative max-w-5xl py-14 md:py-24">
          <Link href="/news" className="text-sm font-semibold text-[#9da3a8] transition hover:text-[#efc76e]">← Zurück zu allen News</Link>
          <span className="badge badge-gold mt-12 block w-fit">{post.coverLabel || "News"}</span>
          <h1 className="page-title mt-6 max-w-4xl">{post.title}</h1>
          <p className="body-large mt-5 max-w-3xl">{post.excerpt}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em] text-[#73797d]">
            <time>{formatDate(post.publishedAt)}</time>
            {post.editedAt && <span className="rounded-full border border-[#d6aa4c]/20 px-3 py-1 text-[#efc76e]">Bearbeitet am {formatDateTime(post.editedAt)}</span>}
          </div>
        </div>
      </header>

      <div className="container-shell max-w-5xl">
        {post.thumbnailUrl && (
          <div className="-mt-4 pt-12 md:-mt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.thumbnailUrl} alt={"Titelbild zu " + post.title} className="max-h-[560px] w-full rounded-[22px] border border-white/[0.1] object-cover shadow-2xl shadow-black/30" />
          </div>
        )}
        <div className="mx-auto max-w-3xl py-14 md:py-20">
          <RichContent content={post.content} />
          <MediaGallery media={post.media} />
        </div>
      </div>
    </article>
  );
}
