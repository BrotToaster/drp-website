import type { NewsView } from "@/lib/demo-data";
import { formatDate } from "@/lib/site";
import { ContentImage } from "@/components/content-image";
import { InterfaceIcon } from "@/components/interface-icon";

export function NewsCard({ post }: { post: NewsView }) {
  return (
    <a href={"/news/" + post.slug} className="surface surface-interactive group overflow-hidden">
      <div className="news-card-media relative flex h-48 items-end overflow-hidden border-b border-[var(--line)] p-5">
        {post.thumbnailUrl ? (
          <ContentImage src={post.thumbnailUrl} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="news-placeholder"><InterfaceIcon name="document" /></div>
        )}
        {post.thumbnailUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />}
        <span className="badge badge-gold relative">{post.coverLabel || "News"}</span>
      </div>
      <div className="p-6">
        <time className="text-xs text-[var(--muted)]">{formatDate(post.publishedAt)}</time>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{post.title}</h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{post.excerpt}</p>
      </div>
    </a>
  );
}
