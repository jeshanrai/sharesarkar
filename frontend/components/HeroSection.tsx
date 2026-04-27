"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import StockChart from "./StockChart";

interface HeroNews {
  id: number;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr.includes("Z") ? dateStr : dateStr + "Z");
  const diffMs = Date.now() - date.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function HeroSection() {
  const [lead, setLead] = useState<HeroNews | null>(null);
  const [stories, setStories] = useState<HeroNews[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [heroRes, storiesRes] = await Promise.all([
          fetch(`${API_URL}/api/news?section=hero_main`),
          fetch(`${API_URL}/api/news?section=hero_stories`),
        ]);
        if (heroRes.ok) {
          const j = await heroRes.json();
          const arr = Array.isArray(j) ? j : (j.data || []);
          if (arr[0]) setLead(arr[0]);
        }
        if (storiesRes.ok) {
          const j = await storiesRes.json();
          const arr = Array.isArray(j) ? j : (j.data || []);
          setStories(arr.slice(0, 5));
        }
      } catch { /* ignore */ }
    }
    load();
  }, []);

  return (
    <section className="py-6 lg:py-10 border-b border-gray-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Lead story ──────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          {lead ? (
            <Link href={`/news/${lead.id}`} className="block group">
              <article className="cursor-pointer">
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900 mb-5">
                  <Image
                    src={lead.image_url}
                    alt={lead.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    priority
                  />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="eyebrow text-[#d32027]">{lead.category}</span>
                  <span className="h-px flex-1 bg-gray-200" />
                  <span className="text-[11px] text-gray-500">{timeAgo(lead.created_at)}</span>
                </div>
                <h1 className="headline-xl text-3xl md:text-5xl text-gray-900 mb-4 group-hover:text-[#d32027] transition-colors">
                  {lead.title}
                </h1>
                <p className="text-base text-gray-600 leading-relaxed line-clamp-3 max-w-3xl">
                  {lead.excerpt}
                </p>
                <p className="mt-4 text-[11px] uppercase tracking-widest text-gray-400">
                  By ShareSanskar Newsroom
                </p>
              </article>
            </Link>
          ) : (
            <div className="aspect-[16/9] bg-gray-100 skeleton" />
          )}
        </div>

        {/* ── Ranked secondary stories rail ───────────────────────── */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="eyebrow text-gray-900 section-rule">Top Stories</h2>
            <Link href="/news" className="text-[11px] uppercase tracking-widest text-gray-500 hover:text-[#d32027]">
              All News →
            </Link>
          </div>

          <ol className="divide-y divide-gray-200 border-t border-gray-200">
            {stories.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="py-4 flex gap-4">
                <div className="w-6 h-6 skeleton rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/3 skeleton" />
                  <div className="h-4 bg-gray-100 rounded w-full skeleton" />
                </div>
              </li>
            ))}
            {stories.map((s, i) => (
              <li key={s.id}>
                <Link href={`/news/${s.id}`} className="group py-4 flex gap-4 cursor-pointer">
                  <span className="font-serif text-3xl text-gray-300 leading-none w-8 shrink-0 group-hover:text-[#d32027] transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="eyebrow text-[#d32027]">{s.category}</span>
                      <span className="text-[11px] text-gray-400">· {timeAgo(s.created_at)}</span>
                    </div>
                    <h3 className="headline-md text-base text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2">
                      {s.title}
                    </h3>
                  </div>
                  {s.image_url && (
                    <div className="hidden sm:block relative w-20 h-20 shrink-0 bg-gray-100 overflow-hidden">
                      <Image src={s.image_url} alt="" fill className="object-cover" sizes="80px" />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Bottom row: live market card spans full width ───────── */}
      <div className="mt-10">
        <StockChart />
      </div>
    </section>
  );
}
