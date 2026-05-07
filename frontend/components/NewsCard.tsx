import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";

const PLACEHOLDER = (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
    <ImageIcon className="w-6 h-6 text-gray-300" />
  </div>
);

interface NewsCardProps {
  id?: number | string;
  slug?: string | null;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  date: string;
  isLarge?: boolean;
}

export default function NewsCard({ id, slug, title, excerpt, imageUrl, category, date, isLarge = false }: NewsCardProps) {
  const target = slug || (id !== undefined ? id : null);
  const href = target !== null ? `/news/${target}` : "/news";
  // Resolve once — null means we should render the placeholder, not pass an
  // empty string to next/image (which logs a console error).
  const resolvedSrc = resolveImageUrl(imageUrl);

  if (isLarge) {
    return (
      <Link href={href} className="block group cursor-pointer">
        <article className="p-4">
          <div className="relative aspect-[4/3] overflow-hidden mb-3 bg-gray-100">
            {resolvedSrc ? (
              <Image
                src={resolvedSrc}
                alt={title}
                fill
                unoptimized={isBackendMedia(resolvedSrc)}
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              PLACEHOLDER
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="meta inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{category}</span>
            <span className="meta text-gray-400">· {date}</span>
          </div>
          <h3 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-3 mb-1.5">
            {title}
          </h3>
          <p className="text-gray-500 line-clamp-2 mb-2">{excerpt}</p>
          <p className="meta text-gray-400">{date}</p>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href} className="block group cursor-pointer">
      <article className="flex gap-3 p-4 border-b border-gray-100 last:border-b-0">
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100">
          {resolvedSrc ? (
            <Image
              src={resolvedSrc}
              alt={title}
              fill
              unoptimized={isBackendMedia(resolvedSrc)}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="80px"
            />
          ) : (
            PLACEHOLDER
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="meta inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{category}</span>
          </div>
          <h4 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2 mb-1.5">
            {title}
          </h4>
          <p className="meta text-gray-400">{date}</p>
        </div>
      </article>
    </Link>
  );
}
