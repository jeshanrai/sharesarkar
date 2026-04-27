"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download, Mail, Phone, TrendingUp } from "lucide-react";

interface Subscriber {
  id: number;
  email: string | null;
  phone: string | null;
  subscription_type: "newsletter" | "ipo_alerts" | "signals";
  created_at: string;
}

interface Stats {
  newsletter: number;
  ipo_alerts: number;
  signals: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const TYPE_LABEL: Record<string, string> = {
  newsletter: "NEPSE Insights",
  ipo_alerts: "IPO Alerts",
  signals: "Buy/Sell Signals",
};
const TYPE_BADGE: Record<string, string> = {
  newsletter: "bg-blue-50 text-blue-700",
  ipo_alerts: "bg-emerald-50 text-emerald-700",
  signals: "bg-amber-50 text-amber-700",
};

type Tab = "all" | "newsletter" | "ipo_alerts" | "signals";

export default function AdminSubscribersPage() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ newsletter: 0, ipo_alerts: 0, signals: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  function authHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const [subs, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/subscribers/admin/all`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/subscribers/admin/stats`, { headers: authHeaders() }),
      ]);
      if (subs.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      setSubscribers(await subs.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this subscriber?")) return;
    try {
      await fetch(`${API_URL}/api/subscribers/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setSubscribers((rows) => rows.filter((s) => s.id !== id));
      load();
    } catch {
      alert("Failed to delete");
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (tab !== "all" && s.subscription_type !== tab) return false;
      if (!term) return true;
      const haystack = `${s.email ?? ""} ${s.phone ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [subscribers, tab, search]);

  function exportCsv() {
    const header = "id,subscription_type,email,phone,created_at";
    const lines = filtered.map((s) =>
      [s.id, s.subscription_type, s.email ?? "", s.phone ?? "", s.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${tab}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = stats.newsletter + stats.ipo_alerts + stats.signals;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-sm text-gray-500">Manage all subscription types from one place</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-sm font-medium border border-gray-200"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" count={totals} icon={<Mail className="w-4 h-4" />} accent="bg-gray-50 text-gray-700" />
        <StatCard label="NEPSE Insights" count={stats.newsletter} icon={<Mail className="w-4 h-4" />} accent="bg-blue-50 text-blue-700" />
        <StatCard label="IPO Alerts" count={stats.ipo_alerts} icon={<Phone className="w-4 h-4" />} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Buy/Sell Signals" count={stats.signals} icon={<TrendingUp className="w-4 h-4" />} accent="bg-amber-50 text-amber-700" />
      </div>

      {/* Filter / search row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 px-3 py-2 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {(["all", "newsletter", "ipo_alerts", "signals"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === t ? "bg-[#009429] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "all" ? "All" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or phone…"
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-full sm:w-64 focus:outline-none focus:border-[#009429]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Subscribed</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No subscribers found</td></tr>
            )}
            {!loading && filtered.map((sub) => {
              const display = sub.email || sub.phone || "—";
              const initial = (sub.email || sub.phone || "?").charAt(0).toUpperCase();
              return (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {initial}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{display}</p>
                        {sub.email && sub.phone && (
                          <p className="text-[11px] text-gray-400">{sub.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${TYPE_BADGE[sub.subscription_type] || "bg-gray-100 text-gray-700"}`}>
                      {TYPE_LABEL[sub.subscription_type] || sub.subscription_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(sub.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label, count, icon, accent,
}: {
  label: string; count: number; icon: React.ReactNode; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{count}</p>
    </div>
  );
}
