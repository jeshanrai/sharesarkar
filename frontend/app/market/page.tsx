"use client";

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity, Layers, Volume2 } from "lucide-react";

// ── All static/mock data (will be replaced by NEPSE API later) ──

const indexData = {
  name: "NEPSE Index",
  value: "2,156.78",
  change: "+18.45",
  changePercent: "+0.86%",
  isUp: true,
  high: "2,172.34",
  low: "2,138.22",
  prevClose: "2,138.33",
  turnover: "Rs. 4.52 B",
  volume: "12,45,678",
  transactions: "45,234",
};

const subIndices = [
  { name: "Banking", value: "1,845.23", change: "+1.45%", isUp: true },
  { name: "Hotels", value: "2,567.12", change: "-0.32%", isUp: false },
  { name: "Hydropower", value: "1,923.89", change: "+2.18%", isUp: true },
  { name: "Development Bank", value: "3,012.56", change: "+0.67%", isUp: true },
  { name: "Finance", value: "1,456.78", change: "-1.24%", isUp: false },
  { name: "Non-Life Insurance", value: "6,234.56", change: "+0.95%", isUp: true },
  { name: "Life Insurance", value: "8,345.67", change: "+1.82%", isUp: true },
  { name: "Microfinance", value: "2,678.90", change: "-0.45%", isUp: false },
  { name: "Manufacture", value: "3,890.12", change: "+0.34%", isUp: true },
  { name: "Others", value: "1,234.56", change: "+0.78%", isUp: true },
  { name: "Mutual Fund", value: "12.45", change: "-0.12%", isUp: false },
  { name: "Trading", value: "1,567.89", change: "+1.56%", isUp: true },
];

const topGainers = [
  { symbol: "SHIVM", name: "Shivam Cements", price: "Rs. 634", change: "+10.00%", volume: "45,234" },
  { symbol: "UPPER", name: "Upper Tamakoshi", price: "Rs. 398", change: "+8.50%", volume: "89,567" },
  { symbol: "NTC", name: "Nepal Telecom", price: "Rs. 785", change: "+6.25%", volume: "34,123" },
  { symbol: "NABIL", name: "Nabil Bank", price: "Rs. 1,245", change: "+5.80%", volume: "67,890" },
  { symbol: "SBL", name: "Siddhartha Bank", price: "Rs. 412", change: "+4.50%", volume: "23,456" },
  { symbol: "PLIC", name: "Prime Life Ins", price: "Rs. 567", change: "+4.30%", volume: "12,345" },
  { symbol: "SCB", name: "Standard Chartered", price: "Rs. 890", change: "+3.90%", volume: "78,901" },
  { symbol: "GBIME", name: "Global IME Bank", price: "Rs. 378", change: "+3.50%", volume: "56,789" },
  { symbol: "ADBL", name: "Agri Dev Bank", price: "Rs. 456", change: "+3.20%", volume: "34,567" },
  { symbol: "PCBL", name: "Prime Commercial", price: "Rs. 234", change: "+2.80%", volume: "90,123" },
];

const topLosers = [
  { symbol: "CHCL", name: "Chilime Hydro", price: "Rs. 567", change: "-8.20%", volume: "12,345" },
  { symbol: "NLICL", name: "Nepal Life Ins", price: "Rs. 945", change: "-6.50%", volume: "34,567" },
  { symbol: "NICA", name: "NIC Asia Bank", price: "Rs. 892", change: "-5.30%", volume: "56,789" },
  { symbol: "HIDCL", name: "HIDCL", price: "Rs. 456", change: "-4.80%", volume: "23,456" },
  { symbol: "NRIC", name: "Nepal Reinsurance", price: "Rs. 678", change: "-3.90%", volume: "45,678" },
  { symbol: "JBBL", name: "Jyoti Bikas Bank", price: "Rs. 234", change: "-3.50%", volume: "67,890" },
  { symbol: "MEGA", name: "Mega Bank", price: "Rs. 345", change: "-3.20%", volume: "89,012" },
  { symbol: "CZBIL", name: "Citizens Bank", price: "Rs. 456", change: "-2.90%", volume: "12,345" },
  { symbol: "NBL", name: "Nepal Bank Ltd", price: "Rs. 321", change: "-2.60%", volume: "34,567" },
  { symbol: "PRVU", name: "Prabhu Bank", price: "Rs. 267", change: "-2.30%", volume: "56,789" },
];

const topTurnover = [
  { symbol: "UPPER", name: "Upper Tamakoshi", turnover: "Rs. 89.5 Cr", price: "Rs. 398", change: "+8.50%", isUp: true },
  { symbol: "NABIL", name: "Nabil Bank", turnover: "Rs. 67.2 Cr", price: "Rs. 1,245", change: "+5.80%", isUp: true },
  { symbol: "NICA", name: "NIC Asia Bank", turnover: "Rs. 56.8 Cr", price: "Rs. 892", change: "-5.30%", isUp: false },
  { symbol: "SCB", name: "Standard Chartered", turnover: "Rs. 45.3 Cr", price: "Rs. 890", change: "+3.90%", isUp: true },
  { symbol: "SHIVM", name: "Shivam Cements", turnover: "Rs. 34.7 Cr", price: "Rs. 634", change: "+10.0%", isUp: true },
];

const sectorSummary = [
  { name: "Commercial Banks", turnover: "Rs. 145.6 Cr", scripts: 24, advance: 18, decline: 4, unchanged: 2 },
  { name: "Hydropower", turnover: "Rs. 98.3 Cr", scripts: 38, advance: 28, decline: 8, unchanged: 2 },
  { name: "Life Insurance", turnover: "Rs. 56.7 Cr", scripts: 19, advance: 12, decline: 5, unchanged: 2 },
  { name: "Development Banks", turnover: "Rs. 45.2 Cr", scripts: 17, advance: 10, decline: 6, unchanged: 1 },
  { name: "Microfinance", turnover: "Rs. 34.8 Cr", scripts: 65, advance: 35, decline: 25, unchanged: 5 },
  { name: "Non-Life Insurance", turnover: "Rs. 23.4 Cr", scripts: 16, advance: 9, decline: 5, unchanged: 2 },
];

const chartData = [2100, 2120, 2115, 2140, 2135, 2150, 2145, 2160, 2155, 2148, 2165, 2170, 2156];

export default function MarketPage() {
  const [activeTable, setActiveTable] = useState<"gainers" | "losers" | "turnover">("gainers");
  const [timeRange, setTimeRange] = useState("1D");

  const maxVal = Math.max(...chartData);
  const minVal = Math.min(...chartData);
  const range = maxVal - minVal;

  const chartPath = chartData
    .map((v, i) => {
      const x = (i / (chartData.length - 1)) * 100;
      const y = 100 - ((v - minVal) / range) * 100;
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Market" }]} />

        {/* Header Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Main Index Card */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Nepal Stock Exchange</p>
                <h1 className="text-3xl font-bold">{indexData.value}</h1>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${indexData.isUp ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {indexData.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {indexData.change} ({indexData.changePercent})
              </div>
            </div>

            {/* Mini Chart */}
            <div className="relative h-32 bg-white/5 rounded-lg p-2 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="marketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${chartPath} L 100,100 L 0,100 Z`} fill="url(#marketGrad)" />
                <path d={chartPath} fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="absolute bottom-1 right-2 flex gap-1">
                {["1D", "1W", "1M", "3M", "1Y"].map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} className={`px-2 py-0.5 rounded text-[10px] font-medium ${timeRange === r ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"}`}>{r}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">High</p>
                <p className="text-sm font-semibold">{indexData.high}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Low</p>
                <p className="text-sm font-semibold">{indexData.low}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Prev Close</p>
                <p className="text-sm font-semibold">{indexData.prevClose}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-brand-green" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Advances</p>
                <p className="text-xl font-bold text-brand-green">156</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Declines</p>
                <p className="text-xl font-bold text-brand-red">89</p>
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
                <p className="text-xl font-bold text-gray-900">{indexData.turnover}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{indexData.transactions}</p>
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
            {subIndices.map((idx) => (
              <div key={idx.name} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <p className="text-xs text-gray-500 mb-1 truncate">{idx.name}</p>
                <p className="font-bold text-gray-900 text-sm">{idx.value}</p>
                <p className={`text-xs font-semibold flex items-center gap-0.5 mt-1 ${idx.isUp ? "text-brand-green" : "text-brand-red"}`}>
                  {idx.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {idx.change}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Gainers / Losers / Turnover Tables */}
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
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Symbol</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {activeTable === "turnover" ? "Turnover" : "Price"}
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Change</th>
                    {activeTable !== "turnover" && (
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Volume</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeTable === "turnover"
                    ? topTurnover.map((s, i) => (
                        <tr key={s.symbol} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-gray-900">{s.symbol}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{s.name}</td>
                          <td className="px-5 py-3 text-sm text-right font-medium text-gray-900">{s.turnover}</td>
                          <td className={`px-5 py-3 text-sm text-right font-semibold ${s.isUp ? "text-brand-green" : "text-brand-red"}`}>{s.change}</td>
                        </tr>
                      ))
                    : (activeTable === "gainers" ? topGainers : topLosers).map((s, i) => (
                        <tr key={s.symbol} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-gray-900">{s.symbol}</td>
                          <td className="px-5 py-3 text-xs text-gray-500">{s.name}</td>
                          <td className="px-5 py-3 text-sm text-right text-gray-700">{s.price}</td>
                          <td className={`px-5 py-3 text-sm text-right font-semibold ${activeTable === "gainers" ? "text-brand-green" : "text-brand-red"}`}>{s.change}</td>
                          <td className="px-5 py-3 text-sm text-right text-gray-500">{s.volume}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sector Summary */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-900">Sector Summary</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Sector</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Turnover</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Scripts</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Advance</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Decline</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Unch.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sectorSummary.map((sec) => (
                    <tr key={sec.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{sec.name}</td>
                      <td className="px-5 py-3 text-sm text-right text-gray-700">{sec.turnover}</td>
                      <td className="px-5 py-3 text-sm text-right text-gray-500">{sec.scripts}</td>
                      <td className="px-5 py-3 text-sm text-right text-brand-green font-semibold">{sec.advance}</td>
                      <td className="px-5 py-3 text-sm text-right text-brand-red font-semibold">{sec.decline}</td>
                      <td className="px-5 py-3 text-sm text-right text-gray-400">{sec.unchanged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* NEPSE API Note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Live Market Data Coming Soon</h3>
              <p className="text-xs text-blue-700">We&apos;re integrating the NEPSE API for real-time market data. Currently showing sample data for demonstration purposes.</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
