import Image from "next/image";
import Link from "next/link";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";

interface NewsItem {
  id: number;
  slug?: string | null;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  read_time: string | null;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchFeatured(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/news?section=featured`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data || []);
  } catch {
    return [];
  }
}

export default async function MoreNews() {
  const news = await fetchFeatured();

  if (news.length === 0) return null;

  return (
    <section className="py-10 border-t border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="headline-md text-gray-900">Featured Articles</h2>
          <p className="meta text-gray-500 mt-0.5">In-depth analysis and educational content</p>
        </div>
        <button className="btn-text px-4 py-1.5 text-gray-600 hover:text-gray-900 transition-colors">
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {news.map((item) => {
          const imgSrc = resolveImageUrl(item.image_url);
          return (
          <Link key={item.id} href={`/news/${item.slug || item.id}`} className="block">
            <article className="group cursor-pointer bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40 overflow-hidden bg-gray-100">
                {imgSrc && (
                  <Image
                    src={imgSrc}
                    alt={item.title}
                    fill
                    unoptimized={isBackendMedia(imgSrc)}
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="meta inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {item.category}
                  </span>
                  {item.read_time && (
                    <span className="meta text-gray-400">{item.read_time}</span>
                  )}
                </div>
                <h3 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2 mb-1.5">
                  {item.title}
                </h3>
                <p className="meta text-gray-500 line-clamp-2 mb-2">{item.excerpt}</p>
                <p className="meta text-gray-400">{formatDate(item.created_at)}</p>
              </div>
            </article>
          </Link>
          );
        })}
      </div>
    </section>
  );
}
