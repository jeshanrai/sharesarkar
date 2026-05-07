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
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const items = FEATURED.map((f) => {
    const found = sectors.find((s) => f.match.test(s.index_name));
    return found ? { alias: f.alias, ...found } : null;
  }).filter(Boolean) as Array<Sector & { alias: string }>;

  const idx = summary?.index;
  const idxUp = (idx?.change ?? 0) >= 0;

  return (
    <div className="sticky top-0 z-[60] bg-white border-b border-slate-200 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-14 sm:h-16 items-stretch overflow-hidden bg-white">
          <div className="shrink-0 flex h-full items-center gap-3 px-3 sm:px-4 lg:px-6 border-r border-slate-200 bg-white">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
            </div>
            <div className="border-l border-slate-200 pl-3 flex items-center gap-2 sm:block">
              <div className="text-[9px] uppercase tracking-widest text-slate-400 sm:mb-0">NEPSE</div>
              <div className="flex items-baseline gap-2">
                <span className="price text-sm sm:text-base font-bold text-slate-800">{fmt(idx?.value ?? 0)}</span>
                <span className={`percent ${idxUp ? "text-emerald-600" : "text-red-500"}`}>
                  {idxUp ? "+" : ""}{fmt(idx?.changePercent ?? 0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden ticker-container h-full">
            <div className="ticker-content animate-ticker flex w-max h-full">
              {[...items, ...items].map((s, i) => {
                const up = Number(s.change_pct) >= 0;
                return (
                  <div key={`${s.index_id}-${i}`} className="shrink-0 flex h-full items-center gap-2 px-3 sm:px-4 lg:px-5 border-r border-slate-200 whitespace-nowrap">
                    <span className="ticker-symbol text-slate-500 font-medium">{s.alias}</span>
                    <span className="price text-slate-700">{fmt(s.close)}</span>
                    <span className={`percent ${up ? "text-emerald-600" : "text-red-500"}`}>
                      {up ? "▲" : "▼"} {up ? "+" : ""}{fmt(s.change_pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
