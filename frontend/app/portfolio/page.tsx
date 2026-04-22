"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Plus, Trash2, TrendingUp, TrendingDown, PieChart, BarChart3,
  Wallet, Calculator, ArrowUpRight, ArrowDownRight, LogOut
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Holding {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  buy_price: number;
  current_price: number;
  sector: string;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
}

const SECTOR_OPTIONS = ["Banking", "Hydropower", "Manufacturing", "Insurance", "Finance", "Others"];

export default function PortfolioPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newHolding, setNewHolding] = useState({
    symbol: "", name: "", quantity: "", buyPrice: "", currentPrice: "", sector: "Banking",
  });

  useEffect(() => {
    const token = localStorage.getItem("user_token");
    if (!token) {
      router.replace("/login?next=/portfolio");
      return;
    }

    const cached = localStorage.getItem("user_profile");
    if (cached) {
      try { setProfile(JSON.parse(cached)); } catch {}
    }

    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/portfolio`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.removeItem("user_token");
          localStorage.removeItem("user_profile");
          router.replace("/login?next=/portfolio");
          return;
        }
        if (res.ok) setHoldings(await res.json());
      } finally {
        setChecking(false);
      }
    }
    load();
  }, [router]);

  const totalInvestment = holdings.reduce((sum, h) => sum + h.buy_price * h.quantity, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.current_price * h.quantity, 0);
  const totalPnL = totalCurrentValue - totalInvestment;
  const totalPnLPercent = totalInvestment > 0 ? ((totalPnL / totalInvestment) * 100).toFixed(2) : "0";
  const isProfit = totalPnL >= 0;

  const sectorAllocation = holdings.reduce((acc, h) => {
    const value = h.current_price * h.quantity;
    acc[h.sector] = (acc[h.sector] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const sectorColors: Record<string, string> = {
    Banking: "bg-blue-500",
    Hydropower: "bg-cyan-500",
    Manufacturing: "bg-orange-500",
    Others: "bg-gray-500",
    Insurance: "bg-purple-500",
    Finance: "bg-indigo-500",
  };

  async function addHolding(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = localStorage.getItem("user_token");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/portfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: newHolding.symbol,
          name: newHolding.name,
          quantity: parseInt(newHolding.quantity, 10) || 0,
          buy_price: parseFloat(newHolding.buyPrice) || 0,
          current_price: parseFloat(newHolding.currentPrice) || 0,
          sector: newHolding.sector,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add holding");

      setHoldings([...holdings, data]);
      setNewHolding({ symbol: "", name: "", quantity: "", buyPrice: "", currentPrice: "", sector: "Banking" });
      setShowAddForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    } finally {
      setSaving(false);
    }
  }

  async function removeHolding(id: number) {
    const token = localStorage.getItem("user_token");
    if (!token) return;
    const res = await fetch(`${API_URL}/api/portfolio/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setHoldings(holdings.filter((h) => h.id !== id));
  }

  function handleLogout() {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_profile");
    router.push("/");
  }

  if (checking) {
    return (
      <PageLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading your portfolio...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Portfolio" }]} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Portfolio Tracker</h1>
            <p className="text-gray-500 text-sm">
              {profile ? `Welcome back, ${profile.name || profile.email}` : "Track your stock investments and analyze performance"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Stock
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Invested</p>
            </div>
            <p className="text-xl font-bold text-gray-900">Rs. {totalInvestment.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Value</p>
            </div>
            <p className="text-xl font-bold text-gray-900">Rs. {totalCurrentValue.toLocaleString()}</p>
          </div>

          <div className={`rounded-xl border p-5 ${isProfit ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isProfit ? "bg-green-100" : "bg-red-100"}`}>
                {isProfit ? <TrendingUp className="w-4 h-4 text-green-700" /> : <TrendingDown className="w-4 h-4 text-red-700" />}
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">P&L</p>
            </div>
            <p className={`text-xl font-bold ${isProfit ? "text-green-700" : "text-red-700"}`}>
              {isProfit ? "+" : ""}Rs. {totalPnL.toLocaleString()}
            </p>
            <p className={`text-xs font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
              ({isProfit ? "+" : ""}{totalPnLPercent}%)
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Holdings</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{holdings.length} Stocks</p>
          </div>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Add New Holding</h3>
            {error && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
            )}
            <form onSubmit={addHolding} className="grid grid-cols-2 md:grid-cols-7 gap-3">
              <input type="text" placeholder="Symbol" value={newHolding.symbol} onChange={(e) => setNewHolding({ ...newHolding, symbol: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              <input type="text" placeholder="Company Name" value={newHolding.name} onChange={(e) => setNewHolding({ ...newHolding, name: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="number" placeholder="Quantity" value={newHolding.quantity} onChange={(e) => setNewHolding({ ...newHolding, quantity: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required min="1" />
              <input type="number" step="0.01" placeholder="Buy Price" value={newHolding.buyPrice} onChange={(e) => setNewHolding({ ...newHolding, buyPrice: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              <input type="number" step="0.01" placeholder="Current Price" value={newHolding.currentPrice} onChange={(e) => setNewHolding({ ...newHolding, currentPrice: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              <select value={newHolding.sector} onChange={(e) => setNewHolding({ ...newHolding, sector: e.target.value })} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                {saving ? "Saving..." : "Add"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
            {holdings.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">No holdings yet</p>
                <p className="text-xs text-gray-500">Click &ldquo;Add Stock&rdquo; to start building your portfolio.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Buy Price</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Current</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">P&L</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {holdings.map((h) => {
                      const pnl = (h.current_price - h.buy_price) * h.quantity;
                      const pnlPercent = h.buy_price > 0 ? (((h.current_price - h.buy_price) / h.buy_price) * 100).toFixed(2) : "0";
                      const profit = pnl >= 0;
                      return (
                        <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold text-gray-900">{h.symbol}</p>
                            <p className="text-[10px] text-gray-500">{h.name}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-gray-700">{h.quantity}</td>
                          <td className="px-5 py-3 text-right text-sm text-gray-600">Rs. {h.buy_price}</td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">Rs. {h.current_price}</td>
                          <td className={`px-5 py-3 text-right text-sm font-semibold ${profit ? "text-brand-green" : "text-brand-red"}`}>
                            <span className="flex items-center justify-end gap-0.5">
                              {profit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {profit ? "+" : ""}Rs. {pnl.toLocaleString()}
                            </span>
                            <span className="text-[10px]">({profit ? "+" : ""}{pnlPercent}%)</span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-gray-700">Rs. {(h.current_price * h.quantity).toLocaleString()}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => removeHolding(h.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4 text-gray-400" /> Sector Allocation
            </h3>
            <div className="space-y-3">
              {Object.entries(sectorAllocation)
                .sort(([, a], [, b]) => b - a)
                .map(([sector, value]) => {
                  const percent = totalCurrentValue > 0 ? ((value / totalCurrentValue) * 100).toFixed(1) : "0";
                  return (
                    <div key={sector}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium">{sector}</span>
                        <span className="text-gray-500">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sectorColors[sector] || "bg-gray-400"}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(sectorAllocation).length === 0 && (
                <p className="text-xs text-gray-400">Add a holding to see allocation.</p>
              )}
            </div>

            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-[10px] text-gray-500">
                <strong>Note:</strong> Holdings are saved to your account. Update current prices manually to reflect market moves.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
