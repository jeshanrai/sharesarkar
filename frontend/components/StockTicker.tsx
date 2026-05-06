"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface TickerStock {
  symbol: string;
  ltp: number;
  diff_pct: number;
  prev_close: number;
}

export default function StockTicker() {
  const [stocks, setStocks] = useState<TickerStock[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/nepse/ticker`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.data)) {
          setStocks(json.data);
          setUpdatedAt(json.updatedAt ?? null);
        }
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (stocks.length === 0) {
    return (
      <div className="bg-slate-50 border-b border-slate-200 py-2">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-3 text-xs text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Connecting to NEPSE feed…
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-b border-slate-200 py-2 overflow-hidden">
      <div className="flex items-center">
        {/* Live label */}
        <div className="hidden sm:flex shrink-0 items-center gap-2 px-4 border-r border-slate-200 mr-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Live</span>
          {updatedAt && (
            <span className="text-[10px] text-slate-400 hidden md:inline">
              {new Date(updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="ticker-container flex-1 min-w-0 overflow-hidden">
          <div className="ticker-content animate-ticker flex w-max">
            {[...stocks, ...stocks].map((stock, index) => {
              const abs = Number(stock.ltp) - Number(stock.prev_close);
              const up = abs >= 0;
              return (
                <div
                  key={`${stock.symbol}-${index}`}
                  className="shrink-0 flex items-center gap-2 whitespace-nowrap px-4 sm:px-5 border-r border-slate-200"
                >
                  <span className="ticker-symbol text-slate-700 font-semibold">{stock.symbol}</span>
                  <span className="price text-slate-600">Rs. {Number(stock.ltp).toFixed(2)}</span>
                  <span className={`percent flex items-center gap-1 ${up ? "text-emerald-600" : "text-red-500"}`}>
                    {up ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {up ? "+" : ""}{abs.toFixed(2)} ({up ? "+" : ""}{Number(stock.diff_pct).toFixed(2)}%)
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
