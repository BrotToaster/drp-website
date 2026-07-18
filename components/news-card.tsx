import Link from "next/link";
import type { NewsView } from "@/lib/demo-data";
import { formatDate } from "@/lib/site";

export function NewsCard({ post }: { post: NewsView }) {
  return (
    <Link href={"/news/" + post.slug} className="surface surface-interactive group overflow-hidden">
      <div className="relative flex h-48 items-end overflow-hidden border-b border-white/[0.07] p-5">
        {post.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(214,170,76,.24),transparent_42%),linear-gradient(135deg,#171b1e,#0b0e10)]">
            <div className="absolute -right-10 top-5 h-36 w-36 rounded-full border border-[#d6aa4c]/20" />
            <div className="absolute right-4 top-12 h-24 w-24 rounded-full border border-[#d6aa4c]/15" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <span className="badge badge-gold relative">{post.coverLabel || "News"}</span>
      </div>
      <div className="p-6">
        <time className="text-xs text-[#73797d]">{formatDate(post.publishedAt)}</time>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">{post.title}</h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#90969a]">{post.excerpt}</p>
      </div>
    </Link>
  );
}
