import NewsCard from "./NewsCard";

interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr + "Z");
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function fetchSection(section: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/news?section=${section}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    // API now returns { data, pagination }
    return Array.isArray(json) ? json : (json.data || []);
  } catch {
    return [];
  }
}

export default async function NewsSection() {
  const [mainNews, sidebarNews] = await Promise.all([
    fetchSection("latest"),
    fetchSection("trending"),
  ]);

  if (mainNews.length === 0 && sidebarNews.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Latest News</h2>
          <p className="text-gray-500 text-xs mt-0.5">Stay updated with Nepal stock market</p>
        </div>
        <button className="px-4 py-1.5 text-gray-600 text-sm font-medium hover:text-gray-900 transition-colors">
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mainNews.map((news) => (
              <NewsCard
                key={news.id}
                title={news.title}
                excerpt={news.excerpt}
                imageUrl={news.image_url}
                category={news.category}
                date={timeAgo(news.created_at)}
                isLarge
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Trending Stories</h3>
            <div className="space-y-4">
              {sidebarNews.map((news) => (
                <NewsCard
                  key={news.id}
                  title={news.title}
                  excerpt={news.excerpt}
                  imageUrl={news.image_url}
                  category={news.category}
                  date={timeAgo(news.created_at)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
