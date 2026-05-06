"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LogOut, LayoutDashboard, FileText, Settings, ExternalLink, Menu, Bell,
  Search, ShieldCheck, BarChart3, Users, UserPen, X, Clock, Mail,
  TrendingUp, AlertCircle,
} from "lucide-react";

type UserRole = "admin" | "author";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NewsItem {
  id: number;
  title: string;
  category: string;
  is_published: number | boolean;
  views: number;
  created_at: string;
}

interface IPOItem {
  id: number;
  company_name: string;
  symbol: string;
  status: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  time: string;
  unread: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("admin");
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Notifications
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ news: NewsItem[]; ipos: IPOItem[] }>({
    news: [],
    ipos: [],
  });
  const searchRef = useRef<HTMLDivElement | null>(null);

  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) {
      setChecking(false);
      return;
    }
    const token = localStorage.getItem("admin_token");
    const username = localStorage.getItem("admin_user");
    const storedRole = localStorage.getItem("admin_role") as UserRole;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setUser(username);
    setRole(storedRole || "admin");
    setChecking(false);
  }, [router, isLoginRoute]);

  // Load notifications (recent activity) when authenticated
  useEffect(() => {
    if (isLoginRoute || checking) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    async function loadNotifications() {
      try {
        const storedRole = localStorage.getItem("admin_role") as UserRole;
        const promises: Promise<Response>[] = [
          fetch(`${API_URL}/api/news/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        if (storedRole === "admin") {
          promises.push(
            fetch(`${API_URL}/api/ipo/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/api/subscribers/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
          );
        }

        const results = await Promise.allSettled(promises);
        const items: Notification[] = [];

        const newsRes = results[0];
        if (newsRes.status === "fulfilled" && newsRes.value.ok) {
          const news: NewsItem[] = await newsRes.value.json();
          // Drafts notification
          const drafts = news.filter((n) => !n.is_published);
          if (drafts.length > 0) {
            items.push({
              id: "drafts",
              title: `${drafts.length} draft article${drafts.length > 1 ? "s" : ""} pending`,
              description: "Articles awaiting publication",
              href: "/admin/news",
              icon: AlertCircle,
              iconBg: "bg-orange-50",
              iconColor: "text-orange-600",
              time: "Now",
              unread: true,
            });
          }
          // Most recent published article
          const recent = [...news]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 2);
          for (const n of recent) {
            items.push({
              id: `news-${n.id}`,
              title: n.title.length > 60 ? n.title.slice(0, 60) + "..." : n.title,
              description: `${n.category} · ${n.views || 0} views`,
              href: `/admin/news/${n.id}`,
              icon: FileText,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
              time: timeAgo(n.created_at),
              unread: false,
            });
          }
        }

        if (storedRole === "admin") {
          const ipoRes = results[1];
          if (ipoRes && ipoRes.status === "fulfilled" && ipoRes.value.ok) {
            const ipos: IPOItem[] = await ipoRes.value.json();
            const open = ipos.filter((i) => i.status === "open");
            if (open.length > 0) {
              items.push({
                id: "open-ipos",
                title: `${open.length} IPO${open.length > 1 ? "s" : ""} currently open`,
                description: "Active subscription period",
                href: "/admin/ipo",
                icon: TrendingUp,
                iconBg: "bg-green-50",
                iconColor: "text-green-600",
                time: "Today",
                unread: true,
              });
            }
          }
          const subsRes = results[2];
          if (subsRes && subsRes.status === "fulfilled" && subsRes.value.ok) {
            const subs: { id: number; created_at: string }[] = await subsRes.value.json();
            const recentSubs = subs.filter((s) => {
              const diffHrs = (Date.now() - new Date(s.created_at).getTime()) / 36e5;
              return diffHrs < 24;
            });
            if (recentSubs.length > 0) {
              items.push({
                id: "recent-subs",
                title: `${recentSubs.length} new subscriber${recentSubs.length > 1 ? "s" : ""}`,
                description: "Joined in the last 24 hours",
                href: "/admin/subscribers",
                icon: Mail,
                iconBg: "bg-purple-50",
                iconColor: "text-purple-600",
                time: "Today",
                unread: true,
              });
            }
          }
        }

        setNotifications(items);
      } catch {
        // ignore
      }
    }

    loadNotifications();
  }, [checking, isLoginRoute]);

  // Live search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ news: [], ipos: [] });
      return;
    }
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const handle = setTimeout(async () => {
      try {
        const storedRole = localStorage.getItem("admin_role") as UserRole;
        const term = searchQuery.toLowerCase();
        const results: { news: NewsItem[]; ipos: IPOItem[] } = { news: [], ipos: [] };

        const newsRes = await fetch(`${API_URL}/api/news/admin/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (newsRes.ok) {
          const news: NewsItem[] = await newsRes.json();
          results.news = news
            .filter(
              (n) =>
                n.title.toLowerCase().includes(term) ||
                n.category.toLowerCase().includes(term)
            )
            .slice(0, 5);
        }

        if (storedRole === "admin") {
          const ipoRes = await fetch(`${API_URL}/api/ipo/admin/all`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (ipoRes.ok) {
            const ipos: IPOItem[] = await ipoRes.json();
            results.ipos = ipos
              .filter(
                (i) =>
                  i.company_name.toLowerCase().includes(term) ||
                  i.symbol.toLowerCase().includes(term)
              )
              .slice(0, 5);
          }
        }

        setSearchResults(results);
      } catch {
        // ignore
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Outside-click for popovers
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function timeAgo(dateStr: string): string {
    const d = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    const diffMs = Date.now() - d.getTime();
    const diffHrs = Math.floor(diffMs / 36e5);
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_permissions");
    router.push("/admin/login");
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#009429]/30 border-t-[#009429] rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Build nav items based on role
  const navItems: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/news", label: "News Management", icon: FileText },
  ];

  if (role === "admin") {
    navItems.push(
      { href: "/admin/authors", label: "Authors", icon: UserPen },
      { href: "/admin/ipo", label: "IPO Listings", icon: BarChart3 },
      { href: "/admin/subscribers", label: "Subscribers", icon: Users },
    );
  }
  // Settings is available for both admin and author (Account + Security)
  navItems.push({ href: "/admin/settings", label: "Settings", icon: Settings });

  const roleLabel = role === "admin" ? "Administrator" : "Author";
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] fixed h-full z-20 overflow-hidden flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 mr-2 text-gray-500 hover:text-[#009429] hover:bg-green-50 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className={`flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${
              sidebarOpen ? "opacity-100" : "opacity-0 w-0"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#009429] to-[#005a19] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Admin<span className="text-[#009429]">Pro</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden ${
                  isActive
                    ? "bg-green-50 text-[#009429]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#009429] rounded-r-full" />
                )}
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-[#009429]" : "text-gray-400 group-hover:text-gray-600"
                  } transition-colors`}
                />
                <span
                  className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${
                    sidebarOpen ? "opacity-100" : "opacity-0 lg:hidden"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8">
          {/* Search */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden md:block" ref={searchRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => searchQuery && setSearchOpen(true)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] sm:text-sm transition-all"
                placeholder="Search articles, IPOs..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Search dropdown */}
              {searchOpen && searchQuery && (
                <div className="absolute mt-2 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                  {searchResults.news.length === 0 && searchResults.ipos.length === 0 && (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No results for &quot;{searchQuery}&quot;
                    </div>
                  )}

                  {searchResults.news.length > 0 && (
                    <div className="py-2">
                      <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                        News ({searchResults.news.length})
                      </p>
                      {searchResults.news.map((n) => (
                        <Link
                          key={`news-${n.id}`}
                          href={`/admin/news/${n.id}`}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 font-medium truncate group-hover:text-[#009429]">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {n.category} · {n.is_published ? "Published" : "Draft"}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {searchResults.ipos.length > 0 && (
                    <div className="py-2 border-t border-gray-50">
                      <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                        IPOs ({searchResults.ipos.length})
                      </p>
                      {searchResults.ipos.map((i) => (
                        <Link
                          key={`ipo-${i.id}`}
                          href="/admin/ipo"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-green-50/50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 font-medium truncate group-hover:text-[#009429]">
                              {i.company_name}
                            </p>
                            <p className="text-[11px] text-gray-500 capitalize">
                              {i.symbol} · {i.status}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-[#009429] hover:bg-green-50 rounded-lg transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#009429] transition-colors" />
              <span className="hidden sm:inline">View Site</span>
            </Link>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full ring-2 ring-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] font-medium text-[#009429] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-gray-500 text-sm">
                        <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <Link
                            key={n.id}
                            href={n.href}
                            onClick={() => setShowNotif(false)}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                              n.unread ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg ${n.iconBg} ${n.iconColor} flex items-center justify-center shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-900 font-medium leading-tight">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
                              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {n.time}
                              </p>
                            </div>
                            {n.unread && (
                              <span className="w-2 h-2 rounded-full bg-[#009429] mt-2 shrink-0" />
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t border-gray-100 p-2">
                    <Link
                      href="/admin"
                      onClick={() => setShowNotif(false)}
                      className="block text-center text-xs font-medium text-[#009429] py-2 hover:bg-gray-50 rounded-lg"
                    >
                      View all activity
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-2">
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold shadow-sm ${
                  role === "admin"
                    ? "bg-gradient-to-tr from-gray-100 to-gray-200 border-gray-300 text-gray-600"
                    : "bg-gradient-to-tr from-blue-50 to-blue-100 border-blue-200 text-blue-600"
                }`}
              >
                {user ? user.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-semibold text-gray-900 leading-none">{user}</p>
                <p
                  className={`text-xs mt-1 ${
                    role === "admin" ? "text-gray-500" : "text-blue-500"
                  }`}
                >
                  {roleLabel}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 ml-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 w-full max-w-7xl mx-auto">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
        </main>
      </div>
    </div>
  );
}
