"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Sector {
  index_id: number;
  index_name: string;
  close: number;
  change_abs: number;
  change_pct: number;
}

interface Summary {
  index: { value: number; change: number; changePercent: number };
}

const fmt = (n: number, d = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

const FEATURED = [
  { match: /^banking/i, alias: "Banking" },
  { match: /^development/i, alias: "Dev. Bank" },
  { match: /^hydropower/i, alias: "Hydropower" },
  { match: /^life insurance/i, alias: "Life Ins." },
  { match: /^non life/i, alias: "Non-Life Ins." },
  { match: /^microfinance/i, alias: "Microfinance" },
  { match: /^finance/i, alias: "Finance" },
  { match: /^manufactur/i, alias: "Manuf." },
  { match: /^hotels/i, alias: "Hotels" },
  { match: /^trading/i, alias: "Trading" },
  { match: /^investment/i, alias: "Investment" },
  { match: /^mutual fund/i, alias: "Mutual Fund" },
];

export default function LiveIndexStrip() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, sec] = await Promise.all([
          fetch(`${API_URL}/api/nepse/summary`).then((r) => r.json()),
          fetch(`${API_URL}/api/nepse/sectors`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setSummary(s);
        setSectors(sec.data ?? []);
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const items = FEATURED.map((f) => {
    const found = sectors.find((s) => f.match.test(s.index_name));
    return found ? { alias: f.alias, ...found } : null;
  }).filter(Boolean) as Array<Sector & { alias: string }>;

  const idx = summary?.index;
  const idxUp = (idx?.change ?? 0) >= 0;

  return (
    <div className="sticky top-0 z-[60] bg-[#0a0a0a] text-white border-b border-white/10 overflow-hidden">
      <div className="flex items-stretch">
        {/* NEPSE pinned tile */}
        <div className="shrink-0 flex items-center gap-3 px-4 lg:px-6 py-2.5 border-r border-white/10 bg-gradient-to-r from-black to-black/0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Live</span>
          </div>
          <div className="border-l border-white/10 pl-3">
            <div className="text-[9px] uppercase tracking-widest text-white/50">NEPSE</div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tabular-nums">{fmt(idx?.value ?? 0)}</span>
              <span className={`text-[11px] font-semibold tabular-nums ${idxUp ? "text-emerald-400" : "text-red-400"}`}>
                {idxUp ? "+" : ""}{fmt(idx?.changePercent ?? 0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Scrolling sub-indices */}
        <div className="flex-1 overflow-hidden ticker-container">
          <div className="ticker-content animate-ticker flex">
            {[...items, ...items].map((s, i) => {
              const up = Number(s.change_pct) >= 0;
              return (
                <div key={`${s.index_id}-${i}`} className="flex items-center gap-2 px-5 py-2.5 border-r border-white/5 whitespace-nowrap">
                  <span className="text-[11px] uppercase tracking-wider text-white/60">{s.alias}</span>
                  <span className="text-sm font-semibold tabular-nums">{fmt(s.close)}</span>
                  <span className={`text-[11px] font-semibold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? "▲" : "▼"} {up ? "+" : ""}{fmt(s.change_pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
