import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

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

  if (isLarge) {
    return (
      <Link href={href} className="block group cursor-pointer">
        <article>
          <div className="relative aspect-[4/3] overflow-hidden mb-3 bg-gray-100">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              PLACEHOLDER
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow text-[#d32027]">{category}</span>
            <span className="meta text-gray-400">· {date}</span>
          </div>
          <h3 className="headline-lg text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-3 mb-2">
            {title}
          </h3>
          <p className="text-gray-600 line-clamp-2">{excerpt}</p>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href} className="block group cursor-pointer">
      <article className="flex gap-3 py-3 border-b border-gray-100 last:border-b-0">
        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="80px"
            />
          ) : (
            PLACEHOLDER
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow text-[#d32027]">{category}</span>
          </div>
          <h4 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2">
            {title}
          </h4>
          <p className="meta text-gray-400 mt-1.5">{date}</p>
        </div>
      </article>
    </Link>
  );
}
