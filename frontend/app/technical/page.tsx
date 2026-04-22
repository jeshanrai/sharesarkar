"use client";

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { TrendingUp, TrendingDown, Target, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, MinusCircle, BarChart3, Activity, Gauge } from "lucide-react";

interface TechnicalStock {
  symbol: string;
  name: string;
  price: number;
  signal: "Buy" | "Sell" | "Hold";
  rsi: number;
  macd: "Bullish" | "Bearish" | "Neutral";
  sma20: number;
  sma50: number;
  support: number;
  resistance: number;
  volume: string;
  trend: "Uptrend" | "Downtrend" | "Sideways";
}

const technicalData: TechnicalStock[] = [
  { symbol: "NABIL", name: "Nabil Bank", price: 1245, signal: "Buy", rsi: 55, macd: "Bullish", sma20: 1220, sma50: 1195, support: 1200, resistance: 1300, volume: "67,890", trend: "Uptrend" },
  { symbol: "NICA", name: "NIC Asia Bank", price: 892, signal: "Sell", rsi: 72, macd: "Bearish", sma20: 910, sma50: 925, support: 860, resistance: 920, volume: "56,789", trend: "Downtrend" },
  { symbol: "UPPER", name: "Upper Tamakoshi", price: 398, signal: "Buy", rsi: 42, macd: "Bullish", sma20: 385, sma50: 370, support: 380, resistance: 420, volume: "89,567", trend: "Uptrend" },
  { symbol: "NTC", name: "Nepal Telecom", price: 785, signal: "Hold", rsi: 50, macd: "Neutral", sma20: 780, sma50: 775, support: 760, resistance: 810, volume: "34,123", trend: "Sideways" },
  { symbol: "SHIVM", name: "Shivam Cements", price: 634, signal: "Buy", rsi: 38, macd: "Bullish", sma20: 610, sma50: 590, support: 600, resistance: 680, volume: "45,234", trend: "Uptrend" },
  { symbol: "HIDCL", name: "HIDCL", price: 456, signal: "Sell", rsi: 68, macd: "Bearish", sma20: 470, sma50: 485, support: 440, resistance: 475, volume: "23,456", trend: "Downtrend" },
  { symbol: "SBL", name: "Siddhartha Bank", price: 412, signal: "Buy", rsi: 45, macd: "Bullish", sma20: 400, sma50: 390, support: 395, resistance: 435, volume: "23,456", trend: "Uptrend" },
  { symbol: "CHCL", name: "Chilime Hydro", price: 567, signal: "Hold", rsi: 52, macd: "Neutral", sma20: 570, sma50: 575, support: 550, resistance: 590, volume: "12,345", trend: "Sideways" },
  { symbol: "SCB", name: "Standard Chartered", price: 890, signal: "Buy", rsi: 48, macd: "Bullish", sma20: 870, sma50: 850, support: 860, resistance: 930, volume: "78,901", trend: "Uptrend" },
  { symbol: "GBIME", name: "Global IME Bank", price: 378, signal: "Sell", rsi: 75, macd: "Bearish", sma20: 395, sma50: 405, support: 360, resistance: 395, volume: "56,789", trend: "Downtrend" },
];

const signalConfig = {
  Buy: { color: "text-green-700", bg: "bg-green-50 ring-green-600/20", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Sell: { color: "text-red-700", bg: "bg-red-50 ring-red-600/20", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  Hold: { color: "text-orange-700", bg: "bg-orange-50 ring-orange-600/20", icon: <MinusCircle className="w-3.5 h-3.5" /> },
};

function getRSIColor(rsi: number) {
  if (rsi > 70) return "text-brand-red";
  if (rsi < 30) return "text-brand-green";
  return "text-gray-700";
}

function getRSILabel(rsi: number) {
  if (rsi > 70) return "Overbought";
  if (rsi < 30) return "Oversold";
  return "Neutral";
}

export default function TechnicalAnalysisPage() {
  const [filterSignal, setFilterSignal] = useState<"All" | "Buy" | "Sell" | "Hold">("All");
  const [selectedStock, setSelectedStock] = useState<TechnicalStock | null>(null);

  const filtered = filterSignal === "All" ? technicalData : technicalData.filter((s) => s.signal === filterSignal);

  const signalCounts = {
    Buy: technicalData.filter((s) => s.signal === "Buy").length,
    Sell: technicalData.filter((s) => s.signal === "Sell").length,
    Hold: technicalData.filter((s) => s.signal === "Hold").length,
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Technical Analysis" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Technical Analysis</h1>
          <p className="text-gray-500 text-sm">RSI, MACD, SMA signals and support/resistance levels for top NEPSE stocks</p>
        </div>

        {/* Signal Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div
            className="bg-green-50 border border-green-100 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterSignal("Buy")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{signalCounts.Buy}</p>
                <p className="text-xs text-green-600 font-medium">Buy Signals</p>
              </div>
            </div>
          </div>
          <div
            className="bg-red-50 border border-red-100 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterSignal("Sell")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{signalCounts.Sell}</p>
                <p className="text-xs text-red-600 font-medium">Sell Signals</p>
              </div>
            </div>
          </div>
          <div
            className="bg-orange-50 border border-orange-100 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterSignal("Hold")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <MinusCircle className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700">{signalCounts.Hold}</p>
                <p className="text-xs text-orange-600 font-medium">Hold Signals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(["All", "Buy", "Sell", "Hold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterSignal(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterSignal === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Signal</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">RSI</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">MACD</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Support</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Resistance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((stock) => {
                    const sc = signalConfig[stock.signal];
                    return (
                      <tr
                        key={stock.symbol}
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedStock?.symbol === stock.symbol ? "bg-blue-50/50" : ""}`}
                        onClick={() => setSelectedStock(stock)}
                      >
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-gray-900">{stock.symbol}</p>
                          <p className="text-[10px] text-gray-500">{stock.name}</p>
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">Rs. {stock.price}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${sc.bg} ${sc.color}`}>
                            {sc.icon} {stock.signal}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-right text-sm font-semibold ${getRSIColor(stock.rsi)}`}>{stock.rsi}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-medium ${stock.macd === "Bullish" ? "text-brand-green" : stock.macd === "Bearish" ? "text-brand-red" : "text-gray-500"}`}>
                            {stock.macd}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-gray-600">Rs. {stock.support}</td>
                        <td className="px-5 py-3 text-right text-sm text-gray-600">Rs. {stock.resistance}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedStock ? (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedStock.symbol}</h3>
                    <p className="text-xs text-gray-500">{selectedStock.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${signalConfig[selectedStock.signal].bg} ${signalConfig[selectedStock.signal].color}`}>
                    {signalConfig[selectedStock.signal].icon} {selectedStock.signal}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Gauge className="w-3 h-3" /> RSI (14)</span>
                      <span className={`text-xs font-semibold ${getRSIColor(selectedStock.rsi)}`}>{selectedStock.rsi} • {getRSILabel(selectedStock.rsi)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${selectedStock.rsi > 70 ? "bg-brand-red" : selectedStock.rsi < 30 ? "bg-brand-green" : "bg-yellow-500"}`} style={{ width: `${selectedStock.rsi}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>Oversold (30)</span>
                      <span>Overbought (70)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">SMA 20</p>
                      <p className="text-sm font-bold text-gray-900">Rs. {selectedStock.sma20}</p>
                      <p className={`text-[10px] font-medium ${selectedStock.price > selectedStock.sma20 ? "text-brand-green" : "text-brand-red"}`}>
                        {selectedStock.price > selectedStock.sma20 ? "Above" : "Below"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] text-gray-500">SMA 50</p>
                      <p className="text-sm font-bold text-gray-900">Rs. {selectedStock.sma50}</p>
                      <p className={`text-[10px] font-medium ${selectedStock.price > selectedStock.sma50 ? "text-brand-green" : "text-brand-red"}`}>
                        {selectedStock.price > selectedStock.sma50 ? "Above" : "Below"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-green-600">Support</p>
                      <p className="text-sm font-bold text-green-700">Rs. {selectedStock.support}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-red-600">Resistance</p>
                      <p className="text-sm font-bold text-red-700">Rs. {selectedStock.resistance}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Trend</span>
                    <span className={`text-xs font-semibold flex items-center gap-1 ${selectedStock.trend === "Uptrend" ? "text-brand-green" : selectedStock.trend === "Downtrend" ? "text-brand-red" : "text-gray-600"}`}>
                      {selectedStock.trend === "Uptrend" ? <ArrowUpRight className="w-3 h-3" /> : selectedStock.trend === "Downtrend" ? <ArrowDownRight className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
                      {selectedStock.trend}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">MACD</span>
                    <span className={`text-xs font-semibold ${selectedStock.macd === "Bullish" ? "text-brand-green" : selectedStock.macd === "Bearish" ? "text-brand-red" : "text-gray-600"}`}>
                      {selectedStock.macd}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Volume</span>
                    <span className="text-xs font-semibold text-gray-900">{selectedStock.volume}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">Click a stock to see detailed technical analysis</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] text-amber-700">
                <strong>Disclaimer:</strong> Technical signals are for educational purposes only. Always do your own research before making investment decisions. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
