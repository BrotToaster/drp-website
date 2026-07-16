import { notFound } from "next/navigation";
import { RichContent } from "@/components/rich-content";
import { MediaGallery } from "@/components/media-gallery";
import { getPublishedNews } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await getPublishedNews()).find((item) => item.slug === slug);
  if (!post) notFound();
  return (
    <article>
      <header className="border-b border-white/[0.07]">
        <div className="container-shell max-w-4xl py-20 md:py-28">
          <span className="badge badge-gold">{post.coverLabel || "News"}</span>
          <h1 className="page-title mt-6">{post.title}</h1>
          <p className="body-large mt-5">{post.excerpt}</p>
          <time className="mt-7 block text-xs uppercase tracking-[0.12em] text-[#73797d]">{formatDate(post.publishedAt)}</time>
          {post.editedAt && <p className="mt-2 text-xs text-[#efc76e]">Bearbeitet am {formatDateTime(post.editedAt)}</p>}
        </div>
      </header>
      {post.thumbnailUrl && (
        <div className="container-shell max-w-4xl pt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.thumbnailUrl} alt="" className="max-h-[460px] w-full rounded-[18px] border border-white/[0.08] object-cover" />
        </div>
      )}
      <div className="container-shell max-w-4xl py-16 md:py-24">
        <RichContent content={post.content} />
        <MediaGallery media={post.media} />
      </div>
    </article>
  );
}