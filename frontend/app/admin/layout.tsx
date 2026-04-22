"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, FileText, Settings, ExternalLink, Menu, Bell, Search, ShieldCheck, BarChart3, Users, Clock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) {
      setChecking(false);
      return;
    }
    const token = localStorage.getItem("admin_token");
    const username = localStorage.getItem("admin_user");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setUser(username);
    setChecking(false);
  }, [router, isLoginRoute]);

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
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

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/news", label: "News Management", icon: FileText },
    { href: "/admin/ipo", label: "IPO Listings", icon: BarChart3 },
    { href: "/admin/subscribers", label: "Subscribers", icon: Users },
    { href: "/admin/settings", label: "Platform Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside 
        className={`${sidebarOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] fixed h-full z-20 overflow-hidden flex flex-col`}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-100">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 mr-2 text-gray-500 hover:text-[#009429] hover:bg-green-50 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className={`flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 w-0"}`}>
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
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
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
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#009429]" : "text-gray-400 group-hover:text-gray-600"} transition-colors`} />
                <span className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 lg:hidden"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className={`p-4 bg-gradient-to-br from-[#009429] to-[#007a22] rounded-2xl text-white relative overflow-hidden transition-all duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 w-0 h-0 hidden"}`}>
            <div className="relative z-10">
              <h4 className="font-semibold text-sm mb-1">Need help?</h4>
              <p className="text-white/80 text-xs mb-3">Check the documentation for setup guides.</p>
              <button className="bg-white text-[#009429] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors w-full">
                View Docs
              </button>
            </div>
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-white/10 rounded-tl-full" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-6 lg:px-8">
          
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429] sm:text-sm transition-all"
                placeholder="Search..."
              />
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
            
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <div className="flex items-center gap-3 ml-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center font-bold text-gray-600 shadow-sm">
                {user ? user.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-semibold text-gray-900 leading-none">{user}</p>
                <p className="text-gray-500 text-xs mt-1">Administrator</p>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
