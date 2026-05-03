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
  author?: string;
  read_time?: string | null;
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
        const res = await fetch(`${API_URL}/api/news?limit=10`);
        if (!res.ok) return;
        const j = await res.json();
        const arr = (Array.isArray(j) ? j : (j.data || [])) as HeroNews[];
        const sorted = [...arr].sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        if (sorted[0]) setLead(sorted[0]);
        setStories(sorted.slice(1, 6));
      } catch { /* ignore */ }
    }
    load();
  }, []);

  return (
    <section className="py-8 lg:py-12 border-b border-gray-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-10">
        {/* ── Lead story ──────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          {lead ? (
            <Link href={`/news/${lead.id}`} className="block group focus-visible:outline-offset-4">
              <article className="cursor-pointer animate-fade-up">
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-900 mb-6">
                  <Image
                    src={lead.image_url}
                    alt={lead.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    priority
                  />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="eyebrow text-[#d32027]">{lead.category}</span>
                  <span className="h-px flex-1 bg-gray-200" />
                  <span className="byline text-gray-500">{timeAgo(lead.created_at)}</span>
                </div>
                <h1 className="headline-hero text-gray-900 mb-5 group-hover:text-[#d32027] transition-colors max-w-[22ch] break-words [overflow-wrap:anywhere]">
                  {lead.title}
                </h1>
                <p className="lead text-gray-600 line-clamp-3 break-words [overflow-wrap:anywhere]">
                  {lead.excerpt}
                </p>
                <p className="byline text-gray-400 mt-5">
                  By {lead.author || "ShareSanskar Newsroom"}
                  {lead.read_time && <span className="mx-2 text-gray-300">·</span>}
                  {lead.read_time}
                </p>
              </article>
            </Link>
          ) : (
            <div className="space-y-5">
              <div className="aspect-[16/9] bg-gray-100 skeleton" />
              <div className="h-4 w-32 bg-gray-100 skeleton" />
              <div className="h-12 bg-gray-100 skeleton" />
              <div className="h-12 w-3/4 bg-gray-100 skeleton" />
            </div>
          )}
        </div>

        {/* ── Ranked secondary stories rail ───────────────────────── */}
        <aside className="lg:col-span-5 lg:border-l lg:border-gray-200 lg:pl-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="eyebrow section-rule">Top Stories</h2>
            <Link
              href="/news"
              className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gray-500 hover:text-[#d32027] transition-colors"
            >
              All News →
            </Link>
          </div>

          <ol className="divide-y divide-gray-200 border-t border-gray-200">
            {stories.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="py-5 flex gap-4">
                <div className="w-8 h-8 skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 w-1/3 skeleton" />
                  <div className="h-4 bg-gray-100 w-full skeleton" />
                  <div className="h-4 bg-gray-100 w-4/5 skeleton" />
                </div>
              </li>
            ))}
            {stories.map((s, i) => (
              <li key={s.id} className="animate-fade-up">
                <Link href={`/news/${s.id}`} className="group py-5 flex gap-4 cursor-pointer">
                  <span className="font-serif text-[2.25rem] font-bold text-gray-200 leading-none w-10 shrink-0 group-hover:text-[#d32027] transition-colors tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="eyebrow text-[#d32027]">{s.category}</span>
                      <span className="byline text-gray-400">· {timeAgo(s.created_at)}</span>
                    </div>
                    <h3 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-3 break-words [overflow-wrap:anywhere]">
                      {s.title}
                    </h3>
                  </div>
                  {s.image_url && (
                    <div className="hidden sm:block relative w-20 h-20 shrink-0 bg-gray-100 overflow-hidden">
                      <Image
                        src={s.image_url}
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="80px"
                      />
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {/* ── Bottom row: live market card spans full width ───────── */}
      <div className="mt-12">
        <StockChart />
      </div>
    </section>
  );
}
