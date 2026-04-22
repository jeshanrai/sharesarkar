"use client";

import { useEffect, useState } from "react";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { Calendar, Clock, DollarSign, TrendingUp, AlertCircle, CheckCircle2, Timer, FileText, Building2, Banknote } from "lucide-react";

interface IPOItem {
  id: number;
  company_name: string;
  symbol: string;
  sector: string;
  share_type: string;
  units: number;
  price_per_unit: number;
  total_amount: string;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Fallback mock data (shown when API is not available)
const mockIPOs: IPOItem[] = [
  {
    id: 1, company_name: "Citizen Investment Trust", symbol: "CIT", sector: "Mutual Fund",
    share_type: "IPO", units: 500000, price_per_unit: 100, total_amount: "Rs. 5 Crore",
    open_date: "2026-04-25", close_date: "2026-04-29", listing_date: null, status: "upcoming",
  },
  {
    id: 2, company_name: "Nepal Hydro Developers Ltd", symbol: "NHDL", sector: "Hydropower",
    share_type: "IPO", units: 1000000, price_per_unit: 100, total_amount: "Rs. 10 Crore",
    open_date: "2026-04-15", close_date: "2026-04-19", listing_date: null, status: "open",
  },
  {
    id: 3, company_name: "Prabhu Capital Ltd", symbol: "PRCL", sector: "Finance",
    share_type: "Right Share", units: 750000, price_per_unit: 100, total_amount: "Rs. 7.5 Crore",
    open_date: "2026-04-10", close_date: "2026-04-14", listing_date: null, status: "closed",
  },
  {
    id: 4, company_name: "Shivam Cements Ltd", symbol: "SHIVM", sector: "Manufacturing",
    share_type: "FPO", units: 2000000, price_per_unit: 287, total_amount: "Rs. 57.4 Crore",
    open_date: "2026-03-20", close_date: "2026-03-24", listing_date: "2026-04-05", status: "listed",
  },
  {
    id: 5, company_name: "Swabhimaan Laghubitta", symbol: "SWBLL", sector: "Microfinance",
    share_type: "IPO", units: 300000, price_per_unit: 100, total_amount: "Rs. 3 Crore",
    open_date: "2026-05-01", close_date: "2026-05-05", listing_date: null, status: "upcoming",
  },
  {
    id: 6, company_name: "Green Energy Nepal Ltd", symbol: "GENL", sector: "Hydropower",
    share_type: "IPO", units: 800000, price_per_unit: 100, total_amount: "Rs. 8 Crore",
    open_date: "2026-04-18", close_date: "2026-04-22", listing_date: null, status: "open",
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  open: { label: "Open Now", color: "text-green-700", icon: <CheckCircle2 className="w-3.5 h-3.5" />, bg: "bg-green-50 ring-green-600/20" },
  upcoming: { label: "Upcoming", color: "text-blue-700", icon: <Timer className="w-3.5 h-3.5" />, bg: "bg-blue-50 ring-blue-600/20" },
  closed: { label: "Closed", color: "text-orange-700", icon: <Clock className="w-3.5 h-3.5" />, bg: "bg-orange-50 ring-orange-600/20" },
  listed: { label: "Listed", color: "text-purple-700", icon: <TrendingUp className="w-3.5 h-3.5" />, bg: "bg-purple-50 ring-purple-600/20" },
};

export default function IPOPage() {
  const [ipos, setIpos] = useState<IPOItem[]>(mockIPOs);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/ipo`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setIpos(data);
        }
      } catch {
        // Use mock data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredIPOs = activeFilter === "all" ? ipos : ipos.filter((i) => i.status === activeFilter);

  const stats = {
    open: ipos.filter((i) => i.status === "open").length,
    upcoming: ipos.filter((i) => i.status === "upcoming").length,
    closed: ipos.filter((i) => i.status === "closed").length,
    listed: ipos.filter((i) => i.status === "listed").length,
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "IPO" }]} />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IPO & Right Shares</h1>
          <p className="text-gray-500 text-sm">Track upcoming, open, and past IPOs in Nepal stock market</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter("open")}>
            <p className="text-2xl font-bold text-green-700">{stats.open}</p>
            <p className="text-xs text-green-600 font-medium">Open Now</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter("upcoming")}>
            <p className="text-2xl font-bold text-blue-700">{stats.upcoming}</p>
            <p className="text-xs text-blue-600 font-medium">Upcoming</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter("closed")}>
            <p className="text-2xl font-bold text-orange-700">{stats.closed}</p>
            <p className="text-xs text-orange-600 font-medium">Closed</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter("listed")}>
            <p className="text-2xl font-bold text-purple-700">{stats.listed}</p>
            <p className="text-xs text-purple-600 font-medium">Listed</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {["all", "open", "upcoming", "closed", "listed"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all capitalize ${
                activeFilter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All IPOs" : f}
            </button>
          ))}
        </div>

        {/* IPO Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-12 bg-gray-200 rounded" />
                  <div className="h-12 bg-gray-200 rounded" />
                  <div className="h-12 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredIPOs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No IPOs found for this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {filteredIPOs.map((ipo) => {
              const sc = statusConfig[ipo.status] || statusConfig.upcoming;
              return (
                <div key={ipo.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                  {/* Status Header */}
                  <div className={`px-5 py-2 flex items-center justify-between ${ipo.status === "open" ? "bg-green-500" : ipo.status === "upcoming" ? "bg-blue-500" : ipo.status === "closed" ? "bg-orange-500" : "bg-purple-500"} text-white`}>
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      {sc.icon} {sc.label}
                    </span>
                    <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">{ipo.share_type}</span>
                  </div>

                  <div className="p-5">
                    {/* Company Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-brand-green transition-colors mb-1">
                          {ipo.company_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{ipo.symbol}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{ipo.sector}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Key Data */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Units</p>
                        <p className="text-sm font-bold text-gray-900">{ipo.units?.toLocaleString() || "N/A"}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Per Unit</p>
                        <p className="text-sm font-bold text-gray-900">Rs. {ipo.price_per_unit}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase mb-0.5">Total</p>
                        <p className="text-sm font-bold text-gray-900">{ipo.total_amount || "N/A"}</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-400" /> Open Date</span>
                        <span className="font-medium">{formatDate(ipo.open_date)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-gray-400" /> Close Date</span>
                        <span className="font-medium">{formatDate(ipo.close_date)}</span>
                      </div>
                      {ipo.listing_date && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-gray-400" /> Listing Date</span>
                          <span className="font-medium">{formatDate(ipo.listing_date)}</span>
                        </div>
                      )}
                    </div>

                    {/* Apply Button (for open IPOs) */}
                    {ipo.status === "open" && (
                      <a
                        href="https://meroshare.cdsc.com.np/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 w-full py-2.5 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors text-center flex items-center justify-center gap-2"
                      >
                        <Banknote className="w-4 h-4" />
                        Apply via MeroShare
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-1">How to Apply for IPO?</h3>
              <p className="text-xs text-amber-700">
                You can apply for IPOs through <strong>MeroShare</strong> (meroshare.cdsc.com.np). Make sure you have a DMAT account and sufficient balance in your connected bank account. Applications are processed on a first-come, first-served basis with a minimum of 10 units per application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
