"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, CheckCircle2, AlertCircle, Database, Clock, Link as LinkIcon } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NepseSettings {
  nepse_api_url: string;
  nepse_refresh_minutes: number;
  last_trade_date: string | null;
  last_updated_at: string | null;
  cached_symbols: number;
  cached_sectors: number;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<NepseSettings | null>(null);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState(5);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function authHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/nepse/admin/settings`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = (await res.json()) as NepseSettings;
      setSettings(data);
      setUrl(data.nepse_api_url);
      setMinutes(data.nepse_refresh_minutes);
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/nepse/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nepse_api_url: url, nepse_refresh_minutes: minutes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMessage({ kind: "ok", text: "Settings saved" });
      load();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function refreshNow() {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/nepse/admin/refresh`, {
        method: "POST",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Refresh failed");
      setMessage({
        kind: "ok",
        text: `Refreshed — ${json.symbols} symbols, ${json.sectors} sectors (${json.tradeDate})`,
      });
      load();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-500">Configure global portal settings</p>
      </div>

      {/* NEPSE data source */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-[#009429]" />
          <h2 className="font-semibold text-gray-900">NEPSE Data Source</h2>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${message.kind === "ok" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
              {message.kind === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scraper API URL</label>
            <input
              type="url"
              value={url}
              disabled={loading}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://nepsescraper.onrender.com/data"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Endpoint must return the {`{ prices, sectors }`} JSON shape used by the NEPSE scraper.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refresh interval (minutes)</label>
            <input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              disabled={loading}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-32 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
            />
            <p className="text-xs text-gray-500 mt-1">
              How often the server re-fetches the scraper (1–1440 min). Data is cached in-memory between refreshes, so the public site is fast.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" /> Last updated
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {settings?.last_updated_at
                  ? new Date(settings.last_updated_at).toLocaleString()
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Database className="w-3.5 h-3.5" /> Cached
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {settings ? `${settings.cached_symbols} symbols · ${settings.cached_sectors} sectors` : "—"}
              </p>
              {settings?.last_trade_date && (
                <p className="text-[10px] text-gray-500 mt-0.5">Trade date: {settings.last_trade_date}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={save}
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              onClick={refreshNow}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
