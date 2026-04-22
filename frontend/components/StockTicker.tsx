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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/nepse/ticker`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.data)) {
          setStocks(json.data);
        }
      } catch {
        /* swallow — ticker is non-critical */
      }
    }

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (stocks.length === 0) return null;

  const changeAbs = (s: TickerStock) => Number(s.ltp) - Number(s.prev_close);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white py-2 overflow-hidden">
      <div className="ticker-container">
        <div className="ticker-content animate-ticker flex gap-8">
          {[...stocks, ...stocks].map((stock, index) => {
            const abs = changeAbs(stock);
            const up = abs >= 0;
            return (
              <div key={`${stock.symbol}-${index}`} className="flex items-center gap-2 whitespace-nowrap px-4">
                <span className="font-bold text-yellow-400">{stock.symbol}</span>
                <span className="text-gray-300">Rs. {Number(stock.ltp).toFixed(2)}</span>
                <span className={`flex items-center gap-1 ${up ? "text-green-400" : "text-red-400"}`}>
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
  );
}
