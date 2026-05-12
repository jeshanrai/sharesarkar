"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, RefreshCw, CheckCircle2, AlertCircle, Database, Clock, Link as LinkIcon,
  User, KeyRound, Shield, Eye, EyeOff, Mail, IdCard,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Tab = "account" | "security" | "nepse";
type UserRole = "admin" | "author";

interface NepseSettings {
  nepse_api_url: string;
  nepse_refresh_minutes: number;
  last_trade_date: string | null;
  last_updated_at: string | null;
  cached_symbols: number;
  cached_sectors: number;
}

interface MeResponse {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role: UserRole;
  created_at: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("admin");
  const [tab, setTab] = useState<Tab>("account");

  // common
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Account
  const [me, setMe] = useState<MeResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // NEPSE
  const [nepseLoading, setNepseLoading] = useState(true);
  const [nepseSaving, setNepseSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<NepseSettings | null>(null);
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState(5);

  function authHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    const storedRole = (localStorage.getItem("admin_role") as UserRole) || "admin";
    setRole(storedRole);
    loadProfile();
    if (storedRole === "admin") loadNepse();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  async function loadProfile() {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/me`, { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      const data = (await res.json()) as MeResponse;
      setMe(data);
      setFullName(data.full_name || "");
      setEmail(data.email || "");
    } catch {
      setMessage({ kind: "err", text: "Failed to load profile" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadNepse() {
    setNepseLoading(true);
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
      setNepseLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ full_name: fullName, email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMessage({ kind: "ok", text: "Profile updated" });
      loadProfile();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ kind: "err", text: "New passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ kind: "err", text: "Password must be at least 6 characters" });
      return;
    }

    setPwdSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/me/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update password");

      setMessage({ kind: "ok", text: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setPwdSaving(false);
    }
  }

  async function saveNepse() {
    setNepseSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/nepse/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nepse_api_url: url, nepse_refresh_minutes: minutes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMessage({ kind: "ok", text: "NEPSE settings saved" });
      loadNepse();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setNepseSaving(false);
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
      loadNepse();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setRefreshing(false);
    }
  }

  const isAdmin = role === "admin";
  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: "account", label: "Account", icon: User },
    { key: "security", label: "Security", icon: Shield },
  ];
  if (isAdmin) tabs.push({ key: "nepse", label: "NEPSE Data", icon: Database });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          {isAdmin ? "Manage your account and global platform settings" : "Manage your account and security"}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-100 bg-gray-50/30 px-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.key
                    ? "text-[#009429] border-[#009429]"
                    : "text-gray-500 border-transparent hover:text-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {message && (
            <div
              className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm mb-5 ${
                message.kind === "ok"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {message.kind === "ok" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* ── Account tab ─────────────────────────────── */}
          {tab === "account" && (
            <div className="space-y-6">
              {profileLoading ? (
                 <p className="text-gray-500 meta">Loading profile...</p>
              ) : (
                <>
                  <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl ${
                        isAdmin
                          ? "bg-gradient-to-tr from-gray-100 to-gray-200 text-gray-600"
                          : "bg-gradient-to-tr from-blue-50 to-blue-100 text-blue-600"
                      }`}
                    >
                      {(me?.full_name || me?.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="headline-sm text-gray-900">
                        {me?.full_name || me?.username}
                      </p>
                      <p className="eyebrow text-gray-500">@{me?.username}</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isAdmin ? "bg-gray-100 text-gray-700" : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        <Shield className="w-2.5 h-2.5" /> {isAdmin ? "Administrator" : "Author"}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={saveProfile} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <IdCard className="w-3.5 h-3.5" /> Username
                      </label>
                      <input
                        type="text"
                        value={me?.username || ""}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Username cannot be changed.</p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {isAdmin ? "Author Name (Default Byline)" : "Author Name"}
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        maxLength={120}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                        placeholder={isAdmin ? "e.g. ShareSanskar" : "Your full name"}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        {isAdmin
                          ? "Shown as the byline on articles you publish (and selectable from the Author dropdown when creating news)."
                          : "Shown as the byline on articles you publish."}
                      </p>
                    </div>

                    {!isAdmin && (
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                          placeholder="you@example.com"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] disabled:opacity-60 transition-colors"
                    >
                      <Save className="w-4 h-4" /> {profileSaving ? "Saving..." : "Save Profile"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── Security tab ────────────────────────────── */}
          {tab === "security" && (
            <form onSubmit={changePassword} className="space-y-5 max-w-lg">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#009429]" /> Change Password
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                    placeholder="Min 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showNew ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                  placeholder="Re-enter new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={pwdSaving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] disabled:opacity-60 transition-colors"
              >
                <KeyRound className="w-4 h-4" /> {pwdSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* ── NEPSE tab ───────────────────────────────── */}
          {isAdmin && tab === "nepse" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <LinkIcon className="w-4 h-4 text-[#009429]" />
                <h2 className="font-semibold text-gray-900">NEPSE Data Source</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scraper API URL
                </label>
                <input
                  type="url"
                  value={url}
                  disabled={nepseLoading}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://nepsescraper.onrender.com/data"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Endpoint must return the {`{ prices, sectors }`} JSON shape used by the NEPSE scraper.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refresh interval (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={minutes}
                  disabled={nepseLoading}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-32 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How often the server re-fetches the scraper (1–1440 min). Cached in-memory between refreshes.
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
                    {settings
                      ? `${settings.cached_symbols} symbols · ${settings.cached_sectors} sectors`
                      : "—"}
                  </p>
                  {settings?.last_trade_date && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Trade date: {settings.last_trade_date}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={saveNepse}
                  disabled={nepseSaving || nepseLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#009429] text-white rounded-xl text-sm font-medium hover:bg-[#007a22] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {nepseSaving ? "Saving…" : "Save Settings"}
                </button>
                <button
                  onClick={refreshNow}
                  disabled={refreshing || nepseLoading}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />{" "}
                  Refresh now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
