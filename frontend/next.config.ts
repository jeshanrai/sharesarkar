import type { NextConfig } from "next";

// next/image's optimizer fetches and re-encodes any URL passed to <Image src>.
// Next requires an explicit allowlist of remote hosts. We derive the dev
// backend host/port from NEXT_PUBLIC_API_URL so a port change here keeps
// images flowing without editing this file.
function dev(): { hostname: string; port: string } {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    return {
      hostname: u.hostname || "localhost",
      port: u.port || (u.protocol === "https:" ? "443" : "80"),
    };
  } catch {
    return { hostname: "localhost", port: "5000" };
  }
}

const devBackend = dev();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Backend dev server (whatever NEXT_PUBLIC_API_URL points at), plus
      // 127.0.0.1 because some platforms route localhost differently. The
      // /uploads/** path constraint keeps things explicit.
      {
        protocol: "http",
        hostname: devBackend.hostname,
        port: devBackend.port,
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: devBackend.port,
        pathname: "/uploads/**",
      },
      // Production / external image sources (Unsplash etc.).
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
