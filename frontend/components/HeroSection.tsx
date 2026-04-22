"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import StockChart from "./StockChart";

interface HeroNews {
  id: number;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
}

interface HeroStory {
  id: number;
  title: string;
  image_url: string;
  category: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const fallbackHero: HeroNews = {
  id: 0,
  title: "NEPSE Hits 6-Month High as Foreign Investors Return to Nepal Market",
  excerpt:
    "The Nepal Stock Exchange index reached its highest level in six months today, driven by renewed interest from foreign institutional investors and strong performance across all major sectors.",
  image_url:
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
  category: "Breaking",
};

const fallbackStories: HeroStory[] = [
  {
    id: 1,
    title: "Banking Sector Rally Continues",
    image_url:
      "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=800&q=80",
    category: "Banking",
  },
  {
    id: 2,
    title: "Hydropower Stocks Surge on Export Deal",
    image_url:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
    category: "Hydropower",
  },
  {
    id: 3,
    title: "New IPO Opens for Subscription",
    image_url:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=80",
    category: "IPO",
  },
];

const quickStats = [
  { label: "Advances", value: "156", color: "text-brand-green" },
  { label: "Declines", value: "89", color: "text-brand-red" },
  { label: "Unchanged", value: "12", color: "text-gray-400" },
];

const trendingStocks = [
  { symbol: "NABIL", price: "1,245", change: "+2.5%", isUp: true },
  { symbol: "NICA", price: "892", change: "-1.2%", isUp: false },
  { symbol: "UPPER", price: "398", change: "+4.8%", isUp: true },
  { symbol: "NTC", price: "785", change: "+1.5%", isUp: true },
];

export default function HeroSection() {
  const [featuredNews, setFeaturedNews] = useState<HeroNews>(fallbackHero);
  const [featuredStories, setFeaturedStories] =
    useState<HeroStory[]>(fallbackStories);

  useEffect(() => {
    async function load() {
      try {
        const [heroRes, storiesRes] = await Promise.all([
          fetch(`${API_URL}/api/news?section=hero_main`),
          fetch(`${API_URL}/api/news?section=hero_stories`),
        ]);

        if (heroRes.ok) {
          const heroJson = await heroRes.json();
          const heroData = Array.isArray(heroJson) ? heroJson : (heroJson.data || []);
          if (heroData.length > 0) {
            setFeaturedNews(heroData[0]);
          }
        }

        if (storiesRes.ok) {
          const storiesJson = await storiesRes.json();
          const storiesData = Array.isArray(storiesJson) ? storiesJson : (storiesJson.data || []);
          if (storiesData.length > 0) {
            setFeaturedStories(storiesData);
          }
        }
      } catch {
        // Keep fallback data
      }
    }
    load();
  }, []);

  return (
    <section className="py-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left side - Featured News */}
        <div className="lg:col-span-3 space-y-5">
          {/* Featured Article */}
          <article className="group cursor-pointer">
            <div className="relative h-72 rounded-lg overflow-hidden bg-gray-900">
              <Image
                src={featuredNews.image_url}
                alt={featuredNews.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="inline-block px-2.5 py-1 bg-brand-red text-white text-xs font-semibold rounded mb-2">
                  {featuredNews.category}
                </span>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1.5 leading-tight">
                  {featuredNews.title}
                </h1>
                <p className="text-gray-300 text-sm line-clamp-2 hidden md:block">
                  {featuredNews.excerpt}
                </p>
              </div>
            </div>
          </article>

          {/* Quick Market Stats */}
          <div className="bg-gray-900 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">
                Market at a Glance
              </h3>
              <span className="text-gray-500 text-xs">As of 3:00 PM</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {quickStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-gray-500 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Total Market Cap</span>
                <span className="text-white font-medium">
                  Rs. 3,245.67 Billion
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-gray-500">Total Turnover</span>
                <span className="text-white font-medium">
                  Rs. 4.52 Billion
                </span>
              </div>
            </div>
          </div>

          {/* Trending Stocks Quick View */}
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">
              Trending Now
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trendingStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-gray-900 text-sm">
                    {stock.symbol}
                  </p>
                  <p className="text-gray-500 text-xs">Rs. {stock.price}</p>
                  <p
                    className={`text-xs font-medium ${stock.isUp ? "text-brand-green" : "text-brand-red"}`}
                  >
                    {stock.change}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Stories Grid */}
          <div className="grid grid-cols-3 gap-3">
            {featuredStories.map((story) => (
              <article key={story.id} className="group cursor-pointer">
                <div className="relative h-80 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={story.image_url}
                    alt={story.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
                      {story.title}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Right side - Stock Chart */}
        <div className="lg:col-span-2">
          <StockChart />
        </div>
      </div>
    </section>
  );
}
