import Image from "next/image";

interface NewsCardProps {
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  date: string;
  isLarge?: boolean;
}

export default function NewsCard({ title, excerpt, imageUrl, category, date, isLarge = false }: NewsCardProps) {
  if (isLarge) {
    return (
      <article className="group cursor-pointer">
        <div className="relative h-48 rounded-lg overflow-hidden mb-3 bg-gray-100">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-[10px] font-medium rounded">
              {category}
            </span>
          </div>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1.5 group-hover:text-brand-green transition-colors line-clamp-2 text-sm">
          {title}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-2 mb-1.5">{excerpt}</p>
        <p className="text-gray-400 text-[10px]">{date}</p>
      </article>
    );
  }

  return (
    <article className="group cursor-pointer flex gap-3">
      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded mb-1">
          {category}
        </span>
        <h4 className="font-medium text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 text-xs">
          {title}
        </h4>
        <p className="text-gray-400 text-[10px] mt-1">{date}</p>
      </div>
    </article>
  );
}
