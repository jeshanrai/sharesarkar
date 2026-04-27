import NewsCard from "./NewsCard";
import SectionHeader from "./SectionHeader";

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
    <section className="py-12 border-b border-gray-200">
      <SectionHeader
        eyebrow="Latest News"
        title="What's moving Nepal's markets"
        description="Hand-picked reporting and analysis from the ShareSanskar newsroom — updated through the trading day."
        href="/news"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
            {mainNews.map((news) => (
              <NewsCard
                key={news.id}
                id={news.id}
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

        <aside className="lg:col-span-1 lg:border-l lg:border-gray-200 lg:pl-8">
          <h3 className="eyebrow text-gray-900 section-rule mb-4">Trending</h3>
          <div className="border-t border-gray-200">
            {sidebarNews.map((news) => (
              <NewsCard
                key={news.id}
                id={news.id}
                title={news.title}
                excerpt={news.excerpt}
                imageUrl={news.image_url}
                category={news.category}
                date={timeAgo(news.created_at)}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
