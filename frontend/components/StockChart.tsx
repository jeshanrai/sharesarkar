"use client";

import { useState } from "react";

interface MarketStat {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

const marketStats: MarketStat[] = [
  { label: "NEPSE Index", value: "2,156.78", change: "+18.45 (0.86%)", changeType: "positive" },
  { label: "Total Turnover", value: "Rs. 4.52 B", changeType: "neutral" },
  { label: "Total Traded Shares", value: "12,45,678", changeType: "neutral" },
  { label: "Total Transactions", value: "45,234", changeType: "neutral" },
  { label: "Total Scrips Traded", value: "245", changeType: "neutral" },
  { label: "Market Cap", value: "Rs. 3,245.67 B", change: "+0.45%", changeType: "positive" },
];

const topGainers = [
  { symbol: "SHIVM", change: "+10.00%", price: "Rs. 634" },
  { symbol: "UPPER", change: "+8.50%", price: "Rs. 398" },
  { symbol: "NTC", change: "+6.25%", price: "Rs. 785" },
  { symbol: "NABIL", change: "+5.80%", price: "Rs. 1,245" },
  { symbol: "SBL", change: "+4.50%", price: "Rs. 412" },
];

const topLosers = [
  { symbol: "CHCL", change: "-8.20%", price: "Rs. 567" },
  { symbol: "NLICL", change: "-6.50%", price: "Rs. 945" },
  { symbol: "NICA", change: "-5.30%", price: "Rs. 892" },
  { symbol: "HIDCL", change: "-4.80%", price: "Rs. 456" },
  { symbol: "GBIME", change: "-3.90%", price: "Rs. 378" },
];

const chartData = [
  2100, 2120, 2115, 2140, 2135, 2150, 2145, 2160, 2155, 2148, 2165, 2170, 2156,
];

export default function StockChart() {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M" | "3M" | "1Y">("1D");

  const maxValue = Math.max(...chartData);
  const minValue = Math.min(...chartData);
  const range = maxValue - minValue;

  const generatePath = () => {
    const width = 100;
    const height = 100;
    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(" L ")}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">NEPSE Index</h2>
            <p className="text-gray-500 text-xs">Nepal Stock Exchange</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">2,156.78</p>
            <p className="text-brand-green font-medium text-sm">+18.45 (0.86%)</p>
          </div>
        </div>

        <div className="flex gap-1 mb-4">
          {(["1D", "1W", "1M", "3M", "1Y"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timeRange === r
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="relative h-40 bg-gray-50 rounded p-3">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#009429" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#009429" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${generatePath()} L 100,100 L 0,100 Z`}
              fill="url(#chartGradient)"
            />
            <path
              d={generatePath()}
              fill="none"
              stroke="#009429"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute bottom-1 left-3 text-[10px] text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Today&apos;s Summary</h3>
        <div className="grid grid-cols-2 gap-2">
          {marketStats.map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded p-3">
              <p className="text-[10px] text-gray-500 mb-0.5">{stat.label}</p>
              <p className="font-semibold text-gray-900 text-sm">{stat.value}</p>
              {stat.change && (
                <p className={`text-[10px] mt-0.5 ${
                  stat.changeType === "positive" ? "text-brand-green" :
                  stat.changeType === "negative" ? "text-brand-red" :
                  "text-gray-500"
                }`}>
                  {stat.change}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab("gainers")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === "gainers"
                ? "bg-brand-green text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Top Gainers
          </button>
          <button
            onClick={() => setActiveTab("losers")}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === "losers"
                ? "bg-brand-red text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Top Losers
          </button>
        </div>

        <div className="space-y-2">
          {(activeTab === "gainers" ? topGainers : topLosers).map((stock, index) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between p-2.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900 text-sm">{stock.symbol}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{stock.price}</p>
                <p className={`text-xs font-semibold ${
                  activeTab === "gainers" ? "text-brand-green" : "text-brand-red"
                }`}>
                  {stock.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
