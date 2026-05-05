"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Menu, X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const now = useNow();

  const dateStr = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "";

  return (
    <header className="sticky top-[37px] z-50 bg-white border-b border-gray-200">
      {/* Utility row */}
      <div className="bg-black text-white text-[11px]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-7 flex items-center justify-between">
          <div className="flex items-center gap-4 text-white/70">
            <span className="hidden sm:inline">{dateStr}</span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="hidden md:inline tabular-nums">Kathmandu {timeStr} NPT</span>
          </div>
          <div className="flex items-center gap-4" />
        </div>
      </div>

      {/* Masthead row */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-6">
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
            <div className="hidden sm:flex w-9 h-9 bg-[#d32027] items-center justify-center group-hover:rotate-3 transition-transform">
              <span className="text-white font-serif font-black text-lg leading-none">S</span>
            </div>
            <div className="leading-none">
              <h1 className="font-serif font-black text-[1.6rem] tracking-tight text-gray-900 leading-none">
                ShareSanskar
              </h1>
              <p className="hidden md:block text-[9px] uppercase tracking-[0.22em] font-semibold text-gray-500 mt-1.5">
                Nepal Markets · Daily
              </p>
            </div>
          </Link>

          {/* Search + actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search NEPSE symbols, news, IPOs…"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#d32027]"
                />
              </div>
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
          </nav>
        </div>
      )}
    </header>
  );
}
