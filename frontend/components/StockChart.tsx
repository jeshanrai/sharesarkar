"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Mover {
  symbol: string; ltp: number; diff_pct: number;
}
interface Summary {
  tradeDate: string | null;
  index: {
    value: number; change: number; changePercent: number;
    high: number; low: number; prevClose: number;
    turnover: number; transactions: number; volume: number;
    advances: number; declines: number; unchanged: number;
  };
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
const fmtInt = (n: number) => Number(n ?? 0).toLocaleString("en-IN");

export default function StockChart() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gainers, setGainers] = useState<Mover[]>([]);
  const [losers, setLosers] = useState<Mover[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, g, l] = await Promise.all([
          fetch(`${API_URL}/api/nepse/summary`).then((r) => r.json()),
          fetch(`${API_URL}/api/nepse/gainers`).then((r) => r.json()),
          fetch(`${API_URL}/api/nepse/losers`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setSummary(s);
        setGainers((g.data ?? []).slice(0, 5));
        setLosers((l.data ?? []).slice(0, 5));
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const idx = summary?.index;
  const isUp = (idx?.change ?? 0) >= 0;
  const breadthTotal = (idx?.advances ?? 0) + (idx?.declines ?? 0) + (idx?.unchanged ?? 0) || 1;
  const adv = ((idx?.advances ?? 0) / breadthTotal) * 100;
  const dec = ((idx?.declines ?? 0) / breadthTotal) * 100;
  const unc = ((idx?.unchanged ?? 0) / breadthTotal) * 100;

  return (
    <div className="border-y-2 border-black bg-white">
      <div className="px-5 lg:px-8 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="eyebrow text-gray-900 section-rule">Markets Snapshot</h2>
        <Link href="/market" className="nav-link text-gray-500 hover:text-[#d32027]">
          Full Market →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* NEPSE composite */}
        <div className="lg:col-span-3 px-5 lg:px-8 py-5">
          <p className="eyebrow text-gray-500 mb-2">NEPSE Index</p>
          <p className="numeric font-bold text-4xl text-gray-900 leading-none">
            {fmtNum(idx?.value ?? 0)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`price ${isUp ? "text-emerald-600" : "text-red-600"}`}>
              {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{fmtNum(idx?.change ?? 0)}
            </span>
            <span className={`percent ${isUp ? "text-emerald-600" : "text-red-600"}`}>
              ({isUp ? "+" : ""}{fmtNum(idx?.changePercent ?? 0)}%)
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <p className="eyebrow text-gray-500">High</p>
              <p className="table-num text-gray-900 mt-0.5">{fmtNum(idx?.high ?? 0)}</p>
            </div>
            <div>
              <p className="eyebrow text-gray-500">Low</p>
              <p className="table-num text-gray-900 mt-0.5">{fmtNum(idx?.low ?? 0)}</p>
            </div>
            <div>
              <p className="eyebrow text-gray-500">Prev</p>
              <p className="table-num text-gray-900 mt-0.5">{fmtNum(idx?.prevClose ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Activity stats */}
        <div className="lg:col-span-3 px-5 lg:px-8 py-5">
          <p className="eyebrow text-gray-500 mb-3">Today&apos;s Activity</p>
          <dl className="space-y-2">
            <div className="flex items-baseline justify-between">
              <dt className="meta text-gray-600">Turnover</dt>
              <dd className="table-num text-gray-900">{fmtMoney(idx?.turnover ?? 0)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="meta text-gray-600">Volume</dt>
              <dd className="table-num text-gray-900">{fmtInt(idx?.volume ?? 0)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="meta text-gray-600">Trades</dt>
              <dd className="table-num text-gray-900">{fmtInt(idx?.transactions ?? 0)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <p className="eyebrow text-gray-500 mb-2">Breadth</p>
            <div className="flex h-1.5 w-full bg-gray-100 overflow-hidden">
              <div className="bg-emerald-500" style={{ width: `${adv}%` }} />
              <div className="bg-gray-400" style={{ width: `${unc}%` }} />
              <div className="bg-red-500" style={{ width: `${dec}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="meta text-emerald-600">{idx?.advances ?? 0} adv</span>
              <span className="meta text-gray-500">{idx?.unchanged ?? 0} unch</span>
              <span className="meta text-red-600">{idx?.declines ?? 0} dec</span>
            </div>
          </div>
        </div>

        {/* Top gainers */}
        <div className="lg:col-span-3 px-5 lg:px-8 py-5">
          <p className="eyebrow text-emerald-700 mb-3">Top Gainers</p>
          <ol className="space-y-1.5">
            {gainers.length === 0 && (
              <li className="meta text-gray-400 py-2">Loading…</li>
            )}
            {gainers.map((s, i) => (
              <li key={s.symbol} className="flex items-baseline gap-2">
                <span className="table-num table-num--regular text-gray-400 w-3">{i + 1}</span>
                <span className="ticker-symbol text-gray-900 flex-1">{s.symbol}</span>
                <span className="price text-gray-600">{fmtNum(s.ltp)}</span>
                <span className="percent text-emerald-600 w-14 text-right">
                  +{fmtNum(s.diff_pct)}%
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top losers */}
        <div className="lg:col-span-3 px-5 lg:px-8 py-5">
          <p className="eyebrow text-red-700 mb-3">Top Losers</p>
          <ol className="space-y-1.5">
            {losers.length === 0 && (
              <li className="meta text-gray-400 py-2">Loading…</li>
            )}
            {losers.map((s, i) => (
              <li key={s.symbol} className="flex items-baseline gap-2">
                <span className="table-num table-num--regular text-gray-400 w-3">{i + 1}</span>
                <span className="ticker-symbol text-gray-900 flex-1">{s.symbol}</span>
                <span className="price text-gray-600">{fmtNum(s.ltp)}</span>
                <span className="percent text-red-600 w-14 text-right">
                  {fmtNum(s.diff_pct)}%
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
