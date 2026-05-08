import NewsCard from "./NewsCard";
import SectionHeader from "./SectionHeader";
import ScrollReveal from "./ScrollReveal";

interface NewsItem {
  id: number;
  slug?: string | null;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  if (Number.isNaN(date.getTime())) return "";
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
    <section className="py-16 border-b border-gray-200">
      <div className="sticky top-20 z-20 bg-white pt-2 pb-6">
        <SectionHeader
          eyebrow="Latest News"
          title="What's moving Nepal's markets"
          description="Hand-picked reporting and analysis from the ShareSanskar newsroom — updated through the trading day."
          href="/news"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start mt-8">
        <div className="lg:col-span-2">
          <ScrollReveal stagger={35}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10 auto-rows-fr">
              {mainNews.map((news) => (
                <div key={news.id} className="reveal bg-white/0 transition-all duration-700 ease-out h-full">
                  <NewsCard
                    id={news.id}
                    slug={news.slug}
                    title={news.title}
                    excerpt={news.excerpt}
                    imageUrl={news.image_url}
                    category={news.category}
                    date={timeAgo(news.created_at)}
                    isLarge
                  />
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <aside className="lg:col-span-1 lg:border-l lg:border-gray-200 lg:pl-10 flex flex-col gap-6 lg:sticky lg:top-44 lg:self-start">
          <h3 className="eyebrow text-gray-900 section-rule">Trending</h3>

          <div className="border-t border-gray-200">
            <ScrollReveal stagger={25}>
              <div className="flex flex-col">
                {sidebarNews.map((news) => (
                  <div key={news.id} className="reveal transition-all duration-600 ease-out">
                    <NewsCard
                      id={news.id}
                      slug={news.slug}
                      title={news.title}
                      excerpt={news.excerpt}
                      imageUrl={news.image_url}
                      category={news.category}
                      date={timeAgo(news.created_at)}
                    />
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hidden lg:block">
            <h4 className="eyebrow text-gray-700 mb-3">Market Snapshot</h4>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span>NEPSE</span>
                <span className="font-semibold">2,345.21</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Change</span>
                <span className="text-red-600">-0.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Volume</span>
                <span>1.2M</span>
              </div>
            </div>
            <div className="mt-4">
              <a href="/market" className="w-full inline-block text-center bg-brand-green text-white px-3 py-2 rounded-lg text-sm">View market</a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
