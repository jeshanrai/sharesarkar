"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FormState {
  value: string;
  status: "idle" | "loading" | "ok" | "error";
  message?: string;
}

const initial: FormState = { value: "", status: "idle" };

async function subscribe(payload: { email?: string; phone?: string; subscription_type: string }) {
  const res = await fetch(`${API_URL}/api/subscribers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
  return json;
}

export default function SubscriptionSection() {
  const [insights, setInsights] = useState<FormState>(initial);
  const [whatsapp, setWhatsapp] = useState<FormState>(initial);
  const [signals, setSignals] = useState<FormState>(initial);

  async function submit(
    e: React.FormEvent,
    state: FormState,
    setter: (s: FormState) => void,
    payload: { email?: string; phone?: string; subscription_type: string }
  ) {
    e.preventDefault();
    if (!state.value.trim()) return;
    setter({ ...state, status: "loading" });
    try {
      const r = await subscribe(payload);
      setter({ value: "", status: "ok", message: r.message || "Subscribed!" });
    } catch (err) {
      setter({ ...state, status: "error", message: (err as Error).message });
    }
  }

  return (
    <section className="py-10 border-t border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Stay Ahead of the Market</h2>
          <p className="text-gray-500 text-xs mt-0.5">Get exclusive insights delivered to you</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full">
          <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-600">5,000+ subscribers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* NEPSE Insights — newsletter */}
        <div className="bg-gray-900 rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-medium rounded">Weekly</span>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1">NEPSE Insights</h3>
          <p className="text-gray-400 text-xs mb-4">Weekly market analysis and stock picks</p>

          {insights.status === "ok" ? (
            <div className="flex items-center justify-center gap-2 py-2.5 bg-white/10 rounded-lg">
              <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-white">{insights.message}</span>
            </div>
          ) : (
            <form onSubmit={(e) => submit(e, insights, setInsights, { email: insights.value, subscription_type: "newsletter" })}>
              <input
                type="email"
                placeholder="Enter your email"
                value={insights.value}
                onChange={(e) => setInsights({ ...insights, value: e.target.value, status: "idle" })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 placeholder-gray-500 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 mb-2"
                required
              />
              <button
                type="submit"
                disabled={insights.status === "loading"}
                className="w-full py-2.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-70"
              >
                {insights.status === "loading" ? "..." : "Subscribe Free"}
              </button>
              {insights.status === "error" && (
                <p className="text-[11px] text-red-400 mt-2">{insights.message}</p>
              )}
            </form>
          )}
        </div>

        {/* IPO Notifications — phone */}
        <div className="bg-brand-green rounded-lg p-5 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-medium rounded">Popular</span>
          </div>

          <h3 className="text-sm font-semibold mb-1">IPO Notifications</h3>
          <p className="text-white/70 text-xs mb-4">Instant WhatsApp alerts for new IPOs</p>

          {whatsapp.status === "ok" ? (
            <div className="flex items-center justify-center gap-2 py-2.5 bg-white/20 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs">{whatsapp.message}</span>
            </div>
          ) : (
            <form onSubmit={(e) => submit(e, whatsapp, setWhatsapp, { phone: `+977${whatsapp.value}`, subscription_type: "ipo_alerts" })}>
              <div className="flex gap-2 mb-2">
                <div className="flex items-center bg-white/20 rounded-lg px-2.5 text-sm">+977</div>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={whatsapp.value}
                  onChange={(e) => setWhatsapp({ ...whatsapp, value: e.target.value, status: "idle" })}
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/10 placeholder-white/50 text-white text-sm border border-white/20 focus:outline-none focus:border-white/40"
                  pattern="[0-9]{10}"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={whatsapp.status === "loading"}
                className="w-full py-2.5 bg-white text-brand-green rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-70"
              >
                {whatsapp.status === "loading" ? "..." : "Get IPO Alerts"}
              </button>
              {whatsapp.status === "error" && (
                <p className="text-[11px] text-white/90 mt-2">{whatsapp.message}</p>
              )}
            </form>
          )}
        </div>

        {/* Buy/Sell Signals — email */}
        <div className="bg-gray-900 rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="px-2 py-0.5 bg-brand-red/20 text-brand-red text-[10px] font-medium rounded">Pro</span>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1">Buy/Sell Signals</h3>
          <p className="text-gray-400 text-xs mb-4">Technical signals with entry & exit levels</p>

          {signals.status === "ok" ? (
            <div className="flex items-center justify-center gap-2 py-2.5 bg-white/10 rounded-lg">
              <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-white">{signals.message}</span>
            </div>
          ) : (
            <form onSubmit={(e) => submit(e, signals, setSignals, { email: signals.value, subscription_type: "signals" })}>
              <input
                type="email"
                placeholder="Enter your email"
                value={signals.value}
                onChange={(e) => setSignals({ ...signals, value: e.target.value, status: "idle" })}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 placeholder-gray-500 text-white text-sm border border-white/10 focus:outline-none focus:border-white/30 mb-2"
                required
              />
              <button
                type="submit"
                disabled={signals.status === "loading"}
                className="w-full py-2.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-70"
              >
                {signals.status === "loading" ? "..." : "Get Free Signals"}
              </button>
              {signals.status === "error" && (
                <p className="text-[11px] text-red-400 mt-2">{signals.message}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
