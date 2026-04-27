import Image from "next/image";
import Link from "next/link";

interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  read_time: string | null;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
          <h2 className="text-xl font-bold text-gray-900">Featured Articles</h2>
          <p className="text-gray-500 text-xs mt-0.5">In-depth analysis and educational content</p>
        </div>
        <button className="px-4 py-1.5 text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors">
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {news.map((item) => (
          <Link key={item.id} href={`/news/${item.id}`} className="block">
            <article className="group cursor-pointer bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative h-40 overflow-hidden bg-gray-100">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">
                    {item.category}
                  </span>
                  {item.read_time && (
                    <span className="text-gray-400 text-[10px]">{item.read_time}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2 text-sm mb-1.5">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-xs line-clamp-2 mb-2">{item.excerpt}</p>
                <p className="text-gray-400 text-[10px]">
                  {new Date(item.created_at + "Z").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
