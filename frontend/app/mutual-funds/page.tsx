"use client";

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, PieChart, BarChart3, Info, Search, Filter } from "lucide-react";

interface MutualFund {
  id: number;
  name: string;
  symbol: string;
  manager: string;
  nav: number;
  navChange: number;
  navChangePercent: number;
  units: string;
  maturityDate: string;
  type: "open-end" | "closed-end";
  sector: string;
  aum: string;
  returnOneYear: number;
}

const mutualFunds: MutualFund[] = [
  { id: 1, name: "Siddhartha Equity Fund", symbol: "SEF", manager: "Siddhartha Capital", nav: 15.23, navChange: 0.45, navChangePercent: 3.04, units: "50,00,000", maturityDate: "2028-12-31", type: "closed-end", sector: "Diversified", aum: "Rs. 76.15 Cr", returnOneYear: 12.5 },
  { id: 2, name: "NIBL Pragati Fund", symbol: "NIBLPF", manager: "NIBL Capital", nav: 12.87, navChange: -0.23, navChangePercent: -1.76, units: "1,00,00,000", maturityDate: "2030-06-15", type: "closed-end", sector: "Diversified", aum: "Rs. 128.7 Cr", returnOneYear: 8.3 },
  { id: 3, name: "Nabil Equity Fund", symbol: "NEF", manager: "Nabil Investment Banking", nav: 14.56, navChange: 0.67, navChangePercent: 4.82, units: "50,00,000", maturityDate: "2029-03-20", type: "closed-end", sector: "Equity", aum: "Rs. 72.8 Cr", returnOneYear: 15.2 },
  { id: 4, name: "Global IME Samunnat Fund", symbol: "GIMES1", manager: "Global IME Capital", nav: 11.45, navChange: 0.12, navChangePercent: 1.06, units: "75,00,000", maturityDate: "2031-01-10", type: "closed-end", sector: "Diversified", aum: "Rs. 85.87 Cr", returnOneYear: 6.8 },
  { id: 5, name: "Laxmi Equity Fund", symbol: "LEMF", manager: "Laxmi Capital", nav: 13.12, navChange: -0.34, navChangePercent: -2.53, units: "50,00,000", maturityDate: "2028-09-30", type: "closed-end", sector: "Equity", aum: "Rs. 65.6 Cr", returnOneYear: 9.1 },
  { id: 6, name: "NMB Hybrid Fund L-1", symbol: "NMBHF1", manager: "NMB Capital", nav: 10.89, navChange: 0.09, navChangePercent: 0.83, units: "1,00,00,000", maturityDate: "2032-04-25", type: "closed-end", sector: "Hybrid", aum: "Rs. 108.9 Cr", returnOneYear: 5.6 },
  { id: 7, name: "Sanima Equity Fund", symbol: "SAEF", manager: "Sanima Capital", nav: 16.34, navChange: 0.78, navChangePercent: 5.01, units: "50,00,000", maturityDate: "2029-07-15", type: "closed-end", sector: "Equity", aum: "Rs. 81.7 Cr", returnOneYear: 18.4 },
  { id: 8, name: "Citizens Mutual Fund-1", symbol: "CMF1", manager: "Citizens Capital", nav: 12.01, navChange: -0.15, navChangePercent: -1.23, units: "75,00,000", maturityDate: "2030-11-20", type: "closed-end", sector: "Diversified", aum: "Rs. 90.07 Cr", returnOneYear: 7.2 },
];

export default function MutualFundsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nav" | "return" | "name">("name");

  const filteredFunds = mutualFunds
    .filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "nav") return b.nav - a.nav;
      if (sortBy === "return") return b.returnOneYear - a.returnOneYear;
      return a.name.localeCompare(b.name);
    });

  const avgNAV = (mutualFunds.reduce((sum, f) => sum + f.nav, 0) / mutualFunds.length).toFixed(2);
  const totalAUM = "Rs. 709.79 Cr";
  const avgReturn = (mutualFunds.reduce((sum, f) => sum + f.returnOneYear, 0) / mutualFunds.length).toFixed(1);

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Mutual Funds" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mutual Funds</h1>
          <p className="text-gray-500 text-sm">Track NAV, performance, and details of Nepal&apos;s mutual fund schemes</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-brand-green" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg NAV</p>
              <p className="text-xl font-bold text-gray-900">Rs. {avgNAV}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total AUM</p>
              <p className="text-xl font-bold text-gray-900">{totalAUM}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg 1Y Return</p>
              <p className="text-xl font-bold text-brand-green">{avgReturn}%</p>
            </div>
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "nav" | "return" | "name")}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="nav">Sort by NAV (High to Low)</option>
              <option value="return">Sort by 1Y Return (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Mutual Funds Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Fund</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">NAV</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Change</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">AUM</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">1Y Return</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Maturity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredFunds.map((fund) => (
                  <tr key={fund.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-green transition-colors">{fund.symbol}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{fund.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600">{fund.manager}</td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">Rs. {fund.nav.toFixed(2)}</td>
                    <td className={`px-5 py-4 text-right text-sm font-semibold flex items-center justify-end gap-0.5 ${fund.navChange >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                      {fund.navChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {fund.navChangePercent.toFixed(2)}%
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-600">{fund.aum}</td>
                    <td className={`px-5 py-4 text-right text-sm font-semibold ${fund.returnOneYear >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                      {fund.returnOneYear > 0 ? "+" : ""}{fund.returnOneYear}%
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-500">
                      {new Date(fund.maturityDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">About Mutual Funds in Nepal</h3>
              <p className="text-xs text-blue-700">
                Mutual funds pool money from multiple investors to invest in a diversified portfolio of stocks, bonds, and other securities.
                In Nepal, mutual funds are managed by licensed fund managers and regulated by SEBON. NAV (Net Asset Value) is calculated daily
                and represents the per-unit market value of the fund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
