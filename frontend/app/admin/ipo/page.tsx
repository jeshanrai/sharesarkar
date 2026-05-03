"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, BarChart3, Plus, Edit, Search, X, Save, AlertCircle,
  Check, Calendar, Building2, Hash, Tag, DollarSign, CheckCircle2,
  Clock, Eye, EyeOff,
} from "lucide-react";

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
  is_published: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SECTORS = [
  "Banking", "Hydropower", "Insurance", "Microfinance",
  "Manufacturing", "Hotel & Tourism", "Trading", "Investment",
  "Finance", "Others",
];

const SHARE_TYPES = ["IPO", "FPO", "Right Share", "Mutual Fund", "Auction"];
const STATUSES = ["upcoming", "open", "closed", "listed"];

const STATUS_BADGE: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700 ring-blue-600/20",
  open: "bg-green-50 text-green-700 ring-green-600/20",
  closed: "bg-orange-50 text-orange-700 ring-orange-600/20",
  listed: "bg-gray-50 text-gray-700 ring-gray-600/20",
};

const EMPTY_FORM = {
  company_name: "",
  symbol: "",
  sector: "Banking",
  share_type: "IPO",
  units: 0,
  price_per_unit: 100,
  total_amount: "",
  open_date: "",
  close_date: "",
  listing_date: "",
  status: "upcoming",
  is_published: true,
};

function toDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AdminIPOPage() {
  const router = useRouter();
  const [ipos, setIpos] = useState<IPOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  function authHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadIPOs() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ipo/admin/all`, { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      setIpos(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const role = localStorage.getItem("admin_role");
    if (role !== "admin") {
      router.push("/admin");
      return;
    }
    loadIPOs();
  }, [router]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEdit(ipo: IPOItem) {
    setEditingId(ipo.id);
    setForm({
      company_name: ipo.company_name,
      symbol: ipo.symbol,
      sector: ipo.sector,
      share_type: ipo.share_type,
      units: ipo.units,
      price_per_unit: ipo.price_per_unit,
      total_amount: ipo.total_amount || "",
      open_date: toDateInput(ipo.open_date),
      close_date: toDateInput(ipo.close_date),
      listing_date: toDateInput(ipo.listing_date),
      status: ipo.status,
      is_published: ipo.is_published,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = editingId
        ? `${API_URL}/api/ipo/${editingId}`
        : `${API_URL}/api/ipo`;
      const method = editingId ? "PUT" : "POST";

      const body = {
        ...form,
        units: Number(form.units) || 0,
        price_per_unit: Number(form.price_per_unit) || 0,
        open_date: form.open_date || null,
        close_date: form.close_date || null,
        listing_date: form.listing_date || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess(editingId ? "IPO updated successfully" : "IPO created successfully");
      await loadIPOs();
      setTimeout(() => setShowModal(false), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`${API_URL}/api/ipo/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setIpos((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    } catch {
      alert("Failed to delete");
    }
  }

  async function togglePublish(ipo: IPOItem) {
    try {
      const res = await fetch(`${API_URL}/api/ipo/${ipo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ is_published: !ipo.is_published }),
      });
      if (res.ok) loadIPOs();
    } catch {
      alert("Failed to update status");
    }
  }

  const stats = useMemo(() => {
    return {
      total: ipos.length,
      upcoming: ipos.filter((i) => i.status === "upcoming").length,
      open: ipos.filter((i) => i.status === "open").length,
      closed: ipos.filter((i) => i.status === "closed").length,
      listed: ipos.filter((i) => i.status === "listed").length,
    };
  }, [ipos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ipos.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!term) return true;
      return (
        i.company_name.toLowerCase().includes(term) ||
        i.symbol.toLowerCase().includes(term) ||
        i.sector.toLowerCase().includes(term)
      );
    });
  }, [ipos, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading IPO listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#009429]" />
            IPO Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage upcoming, open, closed and listed IPO offerings
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> New IPO
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatChip label="Total" count={stats.total} accent="bg-gray-50 text-gray-700" />
        <StatChip label="Upcoming" count={stats.upcoming} accent="bg-blue-50 text-blue-700" />
        <StatChip label="Open" count={stats.open} accent="bg-green-50 text-green-700" />
        <StatChip label="Closed" count={stats.closed} accent="bg-orange-50 text-orange-700" />
        <StatChip label="Listed" count={stats.listed} accent="bg-gray-50 text-gray-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
        <div className="flex flex-wrap gap-1">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                statusFilter === s ? "bg-[#009429] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, symbol, sector..."
            className="pl-9 pr-3 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Sector / Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((ipo) => (
                <tr key={ipo.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{ipo.company_name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{ipo.symbol}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-0.5 text-[11px] bg-gray-50 text-gray-700 rounded-md font-medium">
                      {ipo.sector}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">{ipo.share_type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ring-inset ${
                        STATUS_BADGE[ipo.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ipo.status}
                    </span>
                    {!ipo.is_published && (
                      <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-500">
                        <EyeOff className="w-2.5 h-2.5" /> Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-gray-700 font-semibold">
                      Rs. {Number(ipo.price_per_unit).toLocaleString()}/unit
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {Number(ipo.units).toLocaleString()} units
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] text-gray-600">
                      Open:{" "}
                      <span className="font-medium">
                        {ipo.open_date
                          ? new Date(ipo.open_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-600">
                      Close:{" "}
                      <span className="font-medium">
                        {ipo.close_date
                          ? new Date(ipo.close_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => togglePublish(ipo)}
                        className="p-2 text-gray-400 hover:text-[#009429] hover:bg-green-50 rounded-lg transition-colors"
                        title={ipo.is_published ? "Hide from public" : "Show on public"}
                      >
                        {ipo.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(ipo)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {deleteConfirm === ipo.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(ipo.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg"
                            title="Confirm delete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(ipo.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No IPO listings found</p>
                    <p className="text-sm mt-1">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Click 'New IPO' to create the first listing"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit IPO Listing" : "Create New IPO"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId ? "Update IPO details and status" : "Add a new public offering"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" /> {success}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Company Name *
                  </label>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="e.g. Nepal Investment Mega Bank Ltd."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Symbol *
                  </label>
                  <input
                    type="text"
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                    placeholder="e.g. NIMB"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                    required
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Share Type
                  </label>
                  <select
                    value={form.share_type}
                    onChange={(e) => setForm({ ...form, share_type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  >
                    {SHARE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Sector
                  </label>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  >
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] capitalize"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Units (kitta)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.units}
                    onChange={(e) =>
                      setForm({ ...form, units: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> Price/Unit (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price_per_unit}
                    onChange={(e) =>
                      setForm({ ...form, price_per_unit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Total Amount (display label, optional)
                  </label>
                  <input
                    type="text"
                    value={form.total_amount}
                    onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                    placeholder="e.g. Rs. 25 Crore"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Open Date
                  </label>
                  <input
                    type="date"
                    value={form.open_date}
                    onChange={(e) => setForm({ ...form, open_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Close Date
                  </label>
                  <input
                    type="date"
                    value={form.close_date}
                    onChange={(e) => setForm({ ...form, close_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Listing Date
                  </label>
                  <input
                    type="date"
                    value={form.listing_date}
                    onChange={(e) => setForm({ ...form, listing_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors flex items-center ${
                        form.is_published ? "bg-[#009429] justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Show on public site</p>
                      <p className="text-[11px] text-gray-500">
                        Toggle off to hide this IPO from the public listings
                      </p>
                    </div>
                    {form.is_published ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#009429] text-white text-sm font-medium hover:bg-[#007a22] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {editingId ? "Update IPO" : "Create IPO"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
          {label}
        </p>
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${accent}`}>•</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{count}</p>
    </div>
  );
}
