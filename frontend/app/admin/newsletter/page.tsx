"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Eye, Loader2, CheckCircle2, AlertCircle, Calendar, Settings as SettingsIcon } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface EmailSettings {
  weekly_digest_enabled: boolean;
  weekly_digest_day_of_week: number;
  weekly_digest_hour: number;
  digest_curation_mode: "auto" | "manual";
  weekly_digest_last_sent_at: string | null;
  weekly_digest_last_sent_count: number;
  schedule_label: string;
}

interface DigestArticle {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string;
  category: string;
  image_url: string;
  author: string;
  created_at: string;
}

interface NewsItem {
  id: number;
  title: string;
  category: string;
  is_published: boolean;
  created_at: string;
}

interface NewsletterPick {
  news_id: number;
  sort_order: number;
  title: string;
  category: string;
  is_published: boolean;
  created_at: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminNewsletterPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [preview, setPreview] = useState<{ articles: DigestArticle[]; html: string } | null>(null);
  const [picks, setPicks] = useState<NewsletterPick[]>([]);
  const [allNews, setAllNews] = useState<NewsItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [sendStatus, setSendStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [pickSearch, setPickSearch] = useState("");
  // Controls the "Send Now" confirmation modal. Replaces native confirm()
  // so the dialog is themed and screen-reader friendly.
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);

  function authHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [settingsRes, previewRes, picksRes, newsRes] = await Promise.all([
        fetch(`${API_URL}/api/subscribers/admin/email-settings`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/subscribers/admin/digest-preview`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/subscribers/admin/newsletter-picks`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/news/admin/all`, { headers: authHeaders() }),
      ]);
      if (settingsRes.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (previewRes.ok) setPreview(await previewRes.json());
      if (picksRes.ok) setPicks(await picksRes.json());
      if (newsRes.ok) setAllNews(await newsRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function updateSettings(patch: Partial<EmailSettings>) {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/subscribers/admin/email-settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // If we switched curation mode, refresh the preview to reflect it
        if (patch.digest_curation_mode) loadAll();
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testEmail.trim()) return;
    setTestStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/subscribers/admin/send-test-digest`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: testEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.sent > 0) {
        setTestStatus({ type: "ok", msg: `Test digest sent to ${testEmail}. If it doesn't arrive within 1–2 minutes, check spam folder, then the backend console log for the SMTP response.` });
        setTestEmail("");
      } else {
        setTestStatus({ type: "err", msg: data.reason || data.error || "Send failed — check SMTP config." });
      }
    } catch (err) {
      setTestStatus({ type: "err", msg: (err as Error).message });
    }
  }


  async function performSendNow() {
    setConfirmSendOpen(false);
    setSending(true);
    setSendStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/subscribers/admin/send-digest-now`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.reason) {
        setSendStatus({ type: "err", msg: data.reason });
      } else {
        setSendStatus({
          type: "ok",
          msg: `Digest sent to ${data.sent} of ${data.total} subscribers (${data.articles} articles).`,
        });
        loadAll();
      }
    } catch (err) {
      setSendStatus({ type: "err", msg: (err as Error).message });
    } finally {
      setSending(false);
    }
  }

  async function saveManualPicks(newPicks: number[]) {
    const res = await fetch(`${API_URL}/api/subscribers/admin/newsletter-picks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ news_ids: newPicks }),
    });
    if (res.ok) {
      loadAll();
    }
  }

  const pickedIds = useMemo(() => new Set(picks.map((p) => p.news_id)), [picks]);
  const availableNews = useMemo(() => {
    const term = pickSearch.trim().toLowerCase();
    return allNews
      .filter((n) => n.is_published)
      .filter((n) => !pickedIds.has(n.id))
      .filter((n) => !term || n.title.toLowerCase().includes(term) || n.category.toLowerCase().includes(term))
      .slice(0, 20);
  }, [allNews, pickedIds, pickSearch]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading newsletter settings…
      </div>
    );
  }

  const lastSent = settings.weekly_digest_last_sent_at
    ? new Date(settings.weekly_digest_last_sent_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : "Never";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
        <p className="text-sm text-gray-500">Weekly digest delivered to newsletter subscribers.</p>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Status"
          value={settings.weekly_digest_enabled ? "Active" : "Paused"}
          accent={settings.weekly_digest_enabled ? "text-green-700 bg-green-50" : "text-gray-700 bg-gray-50"}
          icon={<Mail className="w-4 h-4" />}
        />
        <StatCard
          label="Schedule"
          value={settings.schedule_label}
          accent="text-blue-700 bg-blue-50"
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Last sent"
          value={`${lastSent}${settings.weekly_digest_last_sent_count > 0 ? ` · ${settings.weekly_digest_last_sent_count} recipients` : ""}`}
          accent="text-purple-700 bg-purple-50"
          icon={<Send className="w-4 h-4" />}
        />
      </div>

      {/* Settings */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Schedule</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 py-2 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-900">Weekly digest enabled</div>
              <div className="text-xs text-gray-500">Cron fires automatically every week at the chosen time.</div>
            </div>
            <button
              onClick={() => updateSettings({ weekly_digest_enabled: !settings.weekly_digest_enabled })}
              disabled={saving}
              className={`relative w-11 h-6 rounded-full transition-colors ${settings.weekly_digest_enabled ? "bg-[#009429]" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.weekly_digest_enabled ? "translate-x-5" : ""}`} />
            </button>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-semibold text-gray-700 mb-1">Day of week</div>
              <select
                value={settings.weekly_digest_day_of_week}
                onChange={(e) => updateSettings({ weekly_digest_day_of_week: Number(e.target.value) })}
                disabled={saving}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#009429]"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-gray-700 mb-1">Hour (Asia/Kathmandu)</div>
              <select
                value={settings.weekly_digest_hour}
                onChange={(e) => updateSettings({ weekly_digest_hour: Number(e.target.value) })}
                disabled={saving}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#009429]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2">Article selection</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateSettings({ digest_curation_mode: "auto" })}
                disabled={saving}
                className={`text-left p-3 rounded-lg border-2 transition-colors ${
                  settings.digest_curation_mode === "auto" ? "border-[#009429] bg-green-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">Automatic</div>
                <div className="text-xs text-gray-500 mt-1">Last 7 days of published articles (up to 10).</div>
              </button>
              <button
                onClick={() => updateSettings({ digest_curation_mode: "manual" })}
                disabled={saving}
                className={`text-left p-3 rounded-lg border-2 transition-colors ${
                  settings.digest_curation_mode === "manual" ? "border-[#009429] bg-green-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">Manual curation</div>
                <div className="text-xs text-gray-500 mt-1">Pick specific articles below for the next send.</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Manual curation */}
      {settings.digest_curation_mode === "manual" && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Curated articles for next send</h2>
          <p className="text-xs text-gray-500 mb-4">These articles will be included in the next digest. The list clears automatically after a successful send.</p>

          <div className="space-y-2 mb-4">
            {picks.length === 0 && (
              <div className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 rounded-lg">
                No articles selected yet — pick from the list below.
              </div>
            )}
            {picks.map((p, i) => (
              <div key={p.news_id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                    <div className="text-xs text-gray-500">{p.category}</div>
                  </div>
                </div>
                <button
                  onClick={() => saveManualPicks(picks.filter((x) => x.news_id !== p.news_id).map((x) => x.news_id))}
                  className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <input
              type="search"
              value={pickSearch}
              onChange={(e) => setPickSearch(e.target.value)}
              placeholder="Search published articles…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-[#009429]"
            />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {availableNews.map((n) => (
                <button
                  key={n.id}
                  onClick={() => saveManualPicks([...picks.map((p) => p.news_id), n.id])}
                  className="w-full text-left p-2 rounded hover:bg-gray-50 flex justify-between items-center gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 truncate">{n.title}</div>
                    <div className="text-xs text-gray-500">{n.category}</div>
                  </div>
                  <span className="text-xs text-[#009429] font-medium flex-shrink-0">Add →</span>
                </button>
              ))}
              {availableNews.length === 0 && (
                <div className="text-sm text-gray-400 italic py-4 text-center">
                  {pickSearch ? "No matching articles." : "No more published articles to add."}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preview + Actions */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Preview & Send</h2>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {preview ? `${preview.articles.length} article${preview.articles.length === 1 ? "" : "s"} will be included in the next send.` : ""}
        </div>

        {preview && (
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-semibold text-gray-600">Email preview</div>
            {/*
              Render the digest HTML in an isolated iframe so its inline styles
              don't bleed into the admin UI. We deliberately do NOT pass
              `sandbox=""` — that's the strictest sandbox and blocks images
              from loading externally, which is why the preview looked
              unstyled. `srcDoc` is sourced from our own backend, not user
              input, so script execution isn't a concern here.
            */}
            <iframe
              srcDoc={preview.html}
              title="Digest preview"
              className="w-full h-[480px] bg-white"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#009429]"
          />
          <button
            onClick={sendTest}
            disabled={!testEmail.trim()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            Send test
          </button>
          <button
            onClick={() => setConfirmSendOpen(true)}
            disabled={sending}
            className="px-4 py-2 bg-[#009429] hover:bg-[#007a22] text-white rounded-lg text-sm font-medium disabled:opacity-70 flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send now
          </button>
        </div>

        {testStatus && (
          <Notice type={testStatus.type} message={testStatus.msg} />
        )}
        {sendStatus && (
          <Notice type={sendStatus.type} message={sendStatus.msg} />
        )}
      </section>

      {/*
        "Send Now" confirmation modal.
        Replaces the native confirm() dialog so the choice is themed and
        keyboard/screen-reader accessible. Clicking the backdrop or pressing
        Cancel dismisses without sending; only the green Confirm button
        triggers the actual broadcast.
      */}
      {confirmSendOpen && (
        <ConfirmModal
          title="Send digest now?"
          articleCount={preview?.articles.length ?? 0}
          onCancel={() => setConfirmSendOpen(false)}
          onConfirm={performSendNow}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  title,
  articleCount,
  onCancel,
  onConfirm,
}: {
  title: string;
  articleCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="confirm-modal-title" className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This will send the digest with <strong>{articleCount} article{articleCount === 1 ? "" : "s"}</strong> to
              every active newsletter subscriber. The send cannot be recalled once started.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-[#009429] hover:bg-[#007a22] rounded-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Send now
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</span>
      </div>
      <p className="text-sm font-bold text-gray-900 mt-2 truncate">{value}</p>
    </div>
  );
}

function Notice({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  const color = type === "ok" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200";
  return (
    <div className={`mt-3 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${color}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
