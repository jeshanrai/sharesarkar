"use client";

import { useEffect, useState } from "react";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const mockStocks: Stock[] = [
  { symbol: "NABIL", name: "Nabil Bank", price: 1245.0, change: 15.0, changePercent: 1.22 },
  { symbol: "NICA", name: "NIC Asia Bank", price: 892.0, change: -8.5, changePercent: -0.94 },
  { symbol: "NLIC", name: "Nepal Life Insurance", price: 1120.0, change: 25.0, changePercent: 2.28 },
  { symbol: "NTC", name: "Nepal Telecom", price: 785.0, change: 12.0, changePercent: 1.55 },
  { symbol: "HIDCL", name: "HIDCL", price: 456.0, change: -3.0, changePercent: -0.65 },
  { symbol: "UPPER", name: "Upper Tamakoshi", price: 398.0, change: 8.0, changePercent: 2.05 },
  { symbol: "CHCL", name: "Chilime Hydropower", price: 567.0, change: -12.0, changePercent: -2.07 },
  { symbol: "SBL", name: "Siddhartha Bank", price: 412.0, change: 5.5, changePercent: 1.35 },
  { symbol: "SHIVM", name: "Shivam Cements", price: 634.0, change: 18.0, changePercent: 2.92 },
  { symbol: "NLICL", name: "Nepal Life Insurance", price: 945.0, change: -15.0, changePercent: -1.56 },
];

export default function StockTicker() {
  const [stocks] = useState<Stock[]>(mockStocks);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white py-2 overflow-hidden">
      <div className="ticker-container">
        <div className="ticker-content animate-ticker flex gap-8">
          {[...stocks, ...stocks].map((stock, index) => (
            <div key={`${stock.symbol}-${index}`} className="flex items-center gap-2 whitespace-nowrap px-4">
              <span className="font-bold text-yellow-400">{stock.symbol}</span>
              <span className="text-gray-300">Rs. {stock.price.toFixed(2)}</span>
              <span className={`flex items-center gap-1 ${stock.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {stock.change >= 0 ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
