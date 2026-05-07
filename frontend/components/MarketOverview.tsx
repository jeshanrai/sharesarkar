"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionHeader from "./SectionHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SectorRow {
  index_id: number; index_name: string;
  close: number; change_abs: number; change_pct: number; turnover: number;
}
interface PriceRow {
  symbol: string; ltp: number; diff_pct: number;
  turnover: number; volume: number; transactions: number;
}

const fmtNum = (n: number, d = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtMoney = (n: number) => {
  const v = Number(n ?? 0);
  if (v >= 1e9) return `Rs. ${(v / 1e9).toFixed(2)} B`;
  if (v >= 1e7) return `Rs. ${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `Rs. ${(v / 1e5).toFixed(2)} L`;
  return `Rs. ${Math.round(v).toLocaleString("en-IN")}`;
};

export default function MarketOverview() {
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [stocks, setStocks] = useState<PriceRow[]>([]);
  const [tab, setTab] = useState<"turnover" | "volume" | "trades">("turnover");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, t] = await Promise.all([
          fetch(`${API_URL}/api/nepse/sectors`).then((r) => r.json()),
          fetch(`${API_URL}/api/nepse/prices`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setSectors((s.data ?? []).filter((x: SectorRow) =>
          !/^float|^sensitive/i.test(x.index_name)
        ));
        setStocks((t.data ?? []) as PriceRow[]);
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const top = useMemo(() => {
    const sorter = (a: PriceRow, b: PriceRow) => {
      if (tab === "turnover") return b.turnover - a.turnover;
      if (tab === "volume") return b.volume - a.volume;
      return b.transactions - a.transactions;
    };
    return [...stocks].sort(sorter).slice(0, 10);
  }, [stocks, tab]);

  const metricLabel = tab === "turnover" ? "Turnover" : tab === "volume" ? "Volume" : "Trades";
  const formatMetric = (r: PriceRow) =>
    tab === "turnover" ? fmtMoney(r.turnover)
      : tab === "volume" ? Number(r.volume).toLocaleString("en-IN")
      : Number(r.transactions).toLocaleString("en-IN");

  return (
    <section className="py-12 border-b border-gray-200">
      <SectionHeader
        eyebrow="Markets"
        title="Live across NEPSE"
        description="Real-time index movements, sector breadth, and the day's most-traded scrips."
        href="/market"
        hrefLabel="Full Coverage →"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Sub-indices: 2-column dense list ──────────────────── */}
        <div className="lg:col-span-7">
          <div className="flex items-end justify-between mb-4">
            <h3 className="headline-sm text-gray-900">Sub-Indices</h3>
            <span className="meta text-gray-400">Close · Δ%</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-gray-200">
            {sectors.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b border-gray-100 py-3 px-1 skeleton h-14" />
            ))}
            {sectors.map((s) => {
              const up = Number(s.change_pct) >= 0;
              return (
                <Link
                  key={s.index_id}
                  href={`/market#${s.index_name.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group flex items-center justify-between py-3.5 px-1 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`block w-1 h-7 ${up ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-base text-gray-800 group-hover:text-[#d32027] transition-colors truncate">
                      {s.index_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="table-num text-gray-700 text-base">{fmtNum(s.close)}</span>
                    <span className={`percent w-20 text-right text-sm ${up ? "text-emerald-600" : "text-red-600"}`}>
                      {up ? "+" : ""}{fmtNum(s.change_pct)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Most active stocks ────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="flex items-end justify-between mb-4">
            <h3 className="headline-sm text-gray-900">Most Active</h3>
            <div className="flex gap-3">
              {(["turnover", "volume", "trades"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`meta pb-0.5 border-b-2 capitalize transition-colors ${
                    tab === t ? "text-[#d32027] border-[#d32027]" : "text-gray-400 border-transparent hover:text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200">
            <div className="grid grid-cols-12 gap-2 py-2.5 border-b border-gray-100 meta text-gray-500">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Symbol</div>
              <div className="col-span-3 text-right">LTP</div>
              <div className="col-span-2 text-right">Δ%</div>
              <div className="col-span-2 text-right">{metricLabel}</div>
            </div>
            {top.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-3 border-b border-gray-100">
                <div className="col-span-12 h-5 skeleton" />
              </div>
            ))}
            {top.map((r, i) => {
              const up = Number(r.diff_pct) >= 0;
              return (
                <div
                  key={r.symbol}
                  className="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-base group"
                >
                  <div className="col-span-1 table-num table-num--regular text-gray-400">{i + 1}</div>
                  <div className="col-span-4 ticker-symbol text-gray-900 group-hover:text-[#d32027] transition-colors text-sm">{r.symbol}</div>
                  <div className="col-span-3 text-right table-num text-gray-700 text-sm">{fmtNum(r.ltp)}</div>
                  <div className={`col-span-2 text-right percent text-sm ${up ? "text-emerald-600" : "text-red-600"}`}>
                    {up ? "+" : ""}{fmtNum(r.diff_pct)}%
                  </div>
                  <div className="col-span-2 text-right table-num table-num--regular text-gray-600 text-sm">{formatMetric(r)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
