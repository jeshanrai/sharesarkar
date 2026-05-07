"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, X, Bookmark } from "lucide-react";
import { useSavedStories } from "@/lib/useSavedStories";

const primaryNav = [
  { label: "Markets", href: "/market" },
  { label: "News", href: "/news" },
  { label: "IPO", href: "/ipo" },
  { label: "Mutual Funds", href: "/mutual-funds" },
  { label: "Technical", href: "/technical" },
  { label: "Portfolio", href: "/portfolio" },
];

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Navbar() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const now = useNow();
  const { count: savedCount, hydrated: savedHydrated } = useSavedStories();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    setSearchOpen(false);
    setSearchValue("");
    router.push(`/news?search=${encodeURIComponent(q)}`);
  }

  const dateStr = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  return (
    <header className="sticky top-14 sm:top-16 z-50 bg-white border-b border-gray-200">
      {/* Masthead row */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-6">
          {/* Mobile menu trigger */}
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-3 mr-auto lg:mr-0 group">
            {!logoFailed ? (
              <img
                src="/assets/logos/svg/SS Icon only (Fill).svg"
                alt=""
                aria-hidden="true"
                className="hidden sm:block w-9 h-9 object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="hidden sm:flex w-9 h-9 bg-[#d32027] items-center justify-center group-hover:rotate-3 transition-transform">
                <span className="text-white font-serif font-extrabold text-lg leading-none">S</span>
              </div>
            )}
            <div className="leading-none">
              <h1 className="font-serif font-extrabold text-[1.6rem] tracking-tight text-gray-900 leading-none">
                ShareSanskar
              </h1>
              <p className="hidden md:block text-[9px] uppercase tracking-[0.22em] font-semibold text-gray-500 mt-1.5">
                Nepal Markets · Daily
              </p>
            </div>
          </Link>

          {/* Search + actions */}
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
              <span className="whitespace-nowrap">{dateStr}</span>
              <span className="text-slate-300">|</span>
              <span className="tabular-nums whitespace-nowrap">Kathmandu {timeStr} NPT</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <Link
              href="/saved"
              aria-label={savedHydrated && savedCount > 0 ? `Saved stories (${savedCount})` : "Saved stories"}
              title="Read Later"
              className="relative p-2 text-gray-600 hover:text-gray-900"
            >
              <Bookmark className="w-4 h-4" />
              {savedHydrated && savedCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 inline-flex items-center justify-center rounded-full bg-[#d32027] text-white text-[9px] font-bold leading-none"
                >
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </Link>
            <Link
              href="/#subscribe"
              className="btn-text hidden sm:inline-block px-3 py-1.5 bg-black text-white hover:bg-[#d32027] transition-colors"
            >
              Subscribe
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
              <form onSubmit={submitSearch} className="relative" role="search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search news articles…"
                  aria-label="Search news"
                  className="w-full pl-10 pr-24 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#d32027]"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => setSearchValue("")}
                    aria-label="Clear search"
                    className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!searchValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#d32027] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#a31a1f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
              </form>
              <p className="text-[11px] text-gray-400 mt-2">
                Press Enter to search across articles. Looking for a stock symbol? Try the{" "}
                <Link href="/market" className="underline hover:text-gray-700">Markets</Link> page.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary nav row */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 hidden lg:flex items-center h-10 gap-1 overflow-x-auto">
          <Link
            href="/"
            className="nav-link px-3 py-2 text-gray-900 border-b-2 border-[#d32027] -mb-px"
          >
            Latest
          </Link>
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link px-3 py-2 text-gray-700 hover:text-[#d32027] border-b-2 border-transparent hover:border-[#d32027] -mb-px transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="nav-link px-2 py-3 border-b border-gray-100 text-gray-900">Latest</Link>
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="nav-link px-2 py-3 border-b border-gray-100 text-gray-700 hover:text-[#d32027]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/saved"
              onClick={() => setIsMobileMenuOpen(false)}
              className="nav-link px-2 py-3 border-b border-gray-100 text-gray-700 hover:text-[#d32027] flex items-center justify-between"
            >
              <span className="inline-flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Read Later
              </span>
              {savedHydrated && savedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#d32027] text-white text-[10px] font-bold">
                  {savedCount > 99 ? "99+" : savedCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
