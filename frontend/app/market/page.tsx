"use client";

import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity, Layers, Volume2, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface PriceRow {
  symbol: string; open: number; high: number; low: number; close: number;
  ltp: number; volume: number; prev_close: number; turnover: number;
  transactions: number; diff_pct: number;
}
interface SectorRow {
  index_id: number; index_name: string; close: number;
  change_abs: number; change_pct: number; turnover: number;
}
interface Summary {
  tradeDate: string | null; updatedAt: string | null;
  index: {
    value: number; change: number; changePercent: number;
    high: number; low: number; prevClose: number;
    turnover: number; transactions: number; volume: number;
    advances: number; declines: number; unchanged: number;
  };
}

const fmtNum = (n: number, digits = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtInt = (n: number) => Number(n ?? 0).toLocaleString("en-IN");
const fmtMoney = (n: number) => {
  const v = Number(n ?? 0);
  if (v >= 1e9) return `Rs. ${(v / 1e9).toFixed(2)} B`;
  if (v >= 1e7) return `Rs. ${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `Rs. ${(v / 1e5).toFixed(2)} L`;
  return `Rs. ${v.toFixed(0)}`;
};

export default function MarketPage() {
  const [activeTable, setActiveTable] = useState<"gainers" | "losers" | "turnover">("gainers");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [gainers, setGainers] = useState<PriceRow[]>([]);
  const [losers, setLosers] = useState<PriceRow[]>([]);
  const [turnover, setTurnover] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [s, sec, g, l, t] = await Promise.all([
        fetch(`${API_URL}/api/nepse/summary`).then((r) => r.json()),
        fetch(`${API_URL}/api/nepse/sectors`).then((r) => r.json()),
        fetch(`${API_URL}/api/nepse/gainers`).then((r) => r.json()),
        fetch(`${API_URL}/api/nepse/losers`).then((r) => r.json()),
        fetch(`${API_URL}/api/nepse/turnover`).then((r) => r.json()),
      ]);
      setSummary(s);
      setSectors(sec.data ?? []);
      setGainers(g.data ?? []);
      setLosers(l.data ?? []);
      setTurnover(t.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // soft refresh once a minute
    return () => clearInterval(id);
  }, []);

  const idx = summary?.index;
  const isUp = (idx?.change ?? 0) >= 0;

  const activeRows = useMemo(() => {
    if (activeTable === "gainers") return gainers;
    if (activeTable === "losers") return losers;
    return turnover;
  }, [activeTable, gainers, losers, turnover]);

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Market" }]} />

        {/* Status bar */}
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <div>
            {summary?.tradeDate ? (
              <>Trade date: <span className="font-semibold text-gray-700">{summary.tradeDate}</span></>
            ) : loading ? "Loading live market data…" : "No data available"}
          </div>
          <button onClick={load} className="flex items-center gap-1 text-gray-500 hover:text-[#009429]">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            Failed to load market data: {error}
          </div>
        )}

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Nepal Stock Exchange</p>
                <h1 className="text-3xl font-bold">{fmtNum(idx?.value ?? 0)}</h1>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${isUp ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isUp ? "+" : ""}{fmtNum(idx?.change ?? 0)} ({isUp ? "+" : ""}{fmtNum(idx?.changePercent ?? 0)}%)
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="eyebrow text-gray-500">High</p>
                <p className="price text-white font-semibold">{fmtNum(idx?.high ?? 0)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="eyebrow text-gray-500">Low</p>
                <p className="price text-white font-semibold">{fmtNum(idx?.low ?? 0)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="eyebrow text-gray-500">Prev Close</p>
                <p className="price text-white font-semibold">{fmtNum(idx?.prevClose ?? 0)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-brand-green" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Advances</p>
                <p className="text-xl font-bold text-brand-green">{idx?.advances ?? 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Declines</p>
                <p className="text-xl font-bold text-brand-red">{idx?.declines ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Turnover</p>
                <p className="text-xl font-bold text-gray-900">{fmtMoney(idx?.turnover ?? 0)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{fmtInt(idx?.transactions ?? 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Indices Grid */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Sub-Indices</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectors.map((idx2) => {
              const up = Number(idx2.change_pct) >= 0;
              return (
                <div key={idx2.index_id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <p className="text-xs text-gray-500 mb-1 truncate">{idx2.index_name}</p>
                  <p className="font-bold text-gray-900 text-sm">{fmtNum(idx2.close)}</p>
                  <p className={`text-xs font-semibold flex items-center gap-0.5 mt-1 ${up ? "text-brand-green" : "text-brand-red"}`}>
                    {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {up ? "+" : ""}{fmtNum(idx2.change_pct)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gainers / Losers / Turnover */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTable("gainers")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTable === "gainers" ? "text-brand-green border-b-2 border-brand-green bg-green-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <TrendingUp className="w-4 h-4" /> Top Gainers
              </button>
              <button
                onClick={() => setActiveTable("losers")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTable === "losers" ? "text-brand-red border-b-2 border-brand-red bg-red-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <TrendingDown className="w-4 h-4" /> Top Losers
              </button>
              <button
                onClick={() => setActiveTable("turnover")}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTable === "turnover" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Volume2 className="w-4 h-4" /> Top Turnover
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-5 py-3 eyebrow text-gray-500">#</th>
                    <th className="text-left px-5 py-3 eyebrow text-gray-500">Symbol</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">LTP</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {activeTable === "turnover" ? "Turnover" : "Change %"}
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Volume</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Txns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeRows.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-6 text-center text-sm text-gray-400">No data</td></tr>
                  )}
                  {activeRows.map((s, i) => {
                    const up = Number(s.diff_pct) >= 0;
                    return (
                      <tr key={s.symbol} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{s.symbol}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-700">Rs. {fmtNum(s.ltp)}</td>
                        <td className={`px-5 py-3 text-sm text-right font-semibold ${activeTable === "turnover" ? "text-gray-900" : up ? "text-brand-green" : "text-brand-red"}`}>
                          {activeTable === "turnover"
                            ? fmtMoney(s.turnover)
                            : `${up ? "+" : ""}${fmtNum(s.diff_pct)}%`}
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-gray-500">{fmtInt(s.volume)}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-500">{fmtInt(s.transactions)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sector turnover */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Sector Turnover</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Sector</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Close</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Change</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Change %</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Turnover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sectors.map((s) => {
                    const up = Number(s.change_pct) >= 0;
                    return (
                      <tr key={s.index_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.index_name}</td>
                        <td className="px-5 py-3 text-sm text-right text-gray-700">{fmtNum(s.close)}</td>
                        <td className={`px-5 py-3 text-sm text-right font-semibold ${up ? "text-brand-green" : "text-brand-red"}`}>
                          {up ? "+" : ""}{fmtNum(s.change_abs)}
                        </td>
                        <td className={`px-5 py-3 text-sm text-right font-semibold ${up ? "text-brand-green" : "text-brand-red"}`}>
                          {up ? "+" : ""}{fmtNum(s.change_pct)}%
                        </td>
                        <td className="px-5 py-3 text-sm text-right text-gray-700">{fmtMoney(s.turnover)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
