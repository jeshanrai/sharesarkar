import Image from "next/image";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  date: string;
  channel: string;
}

const videos: Video[] = [
  {
    id: "1",
    title: "NEPSE Technical Analysis: Weekly Market Outlook - What to Buy?",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    duration: "15:24",
    views: "12.5K views",
    date: "2 days ago",
    channel: "ShareSanskar",
  },
  {
    id: "2",
    title: "Top 5 Undervalued Stocks in Nepal Stock Market 2024",
    thumbnail: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
    duration: "22:18",
    views: "8.3K views",
    date: "4 days ago",
    channel: "ShareSanskar",
  },
  {
    id: "3",
    title: "How to Apply for IPO in Nepal - Complete Guide for Beginners",
    thumbnail: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
    duration: "18:45",
    views: "25.1K views",
    date: "1 week ago",
    channel: "ShareSanskar",
  },
  {
    id: "4",
    title: "Banking Sector Analysis: Which Bank Stock to Invest In?",
    thumbnail: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80",
    duration: "28:32",
    views: "15.7K views",
    date: "1 week ago",
    channel: "ShareSanskar",
  },
];

export default function YouTubeSection() {
  return (
    <section className="py-10 bg-gray-50 -mx-4 px-4 lg:-mx-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-red rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Video Analysis</h2>
              <p className="text-gray-500 text-xs">Learn from our expert analysis</p>
            </div>
          </div>
          <a
            href="https://youtube.com/@sharesanskar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-red text-white rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
            Subscribe
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {videos.map((video) => (
            <article key={video.id} className="group cursor-pointer">
              <div className="relative aspect-video rounded-lg overflow-hidden mb-2.5 bg-gray-200">
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {video.duration}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 text-xs mb-1.5">
                {video.title}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span>{video.channel}</span>
                <span>•</span>
                <span>{video.views}</span>
                <span>•</span>
                <span>{video.date}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
