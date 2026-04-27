"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight, ShieldCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", data.username);
      localStorage.setItem("admin_role", data.role);
      if (data.permissions) {
        localStorage.setItem("admin_permissions", JSON.stringify(data.permissions));
      }
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden px-4 font-sans text-white">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#009429]/20 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-[#009429]/10 blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-16 h-16 bg-gradient-to-br from-[#009429] to-[#005a19] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(0,148,41,0.4)] mb-6"
          >
            <ShieldCheck className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Share<span className="text-[#009429]">Sanskar</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide uppercase letter-spacing-2">
            Admin &amp; Author Portal
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#009429]/50 to-transparent" />

          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Welcome back
          </h2>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#009429] transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429] focus:border-transparent text-white placeholder-gray-500 transition-all shadow-inner"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#009429] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009429] focus:border-transparent text-white placeholder-gray-500 transition-all shadow-inner"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#009429] to-[#007a22] hover:from-[#00a830] hover:to-[#008a28] text-white rounded-xl font-medium text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,148,41,0.3)] mt-8 group relative overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 transform -translate-x-full skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]" />
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2 z-10">
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </motion.button>
          </form>
        </div>

        <div className="text-center mt-8 space-x-1 text-xs text-gray-500">
          <span>Protected area.</span>
          <a href="/" className="text-[#009429] hover:underline transition-all">
            Return to main site
          </a>
        </div>
      </motion.div>
    </div>
  );
}
