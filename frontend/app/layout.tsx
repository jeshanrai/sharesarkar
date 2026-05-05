import type { Metadata } from "next";
import { Azeret_Mono } from "next/font/google";
import "./globals.css";

const azeretMono = Azeret_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ShareSanskar — Nepal Markets, Daily",
  description: "Live NEPSE coverage, market analysis, IPO updates, and investment journalism for Nepal — from ShareSanskar.",
  keywords: "NEPSE, Nepal Stock Exchange, Nepal stocks, stock market, IPO Nepal, share market, trading, investment",
  openGraph: {
    title: "ShareSanskar — Nepal Markets, Daily",
    description: "Live NEPSE coverage, market analysis, IPO updates, and investment journalism for Nepal.",
    type: "website",
    locale: "en_US",
    siteName: "ShareSanskar",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShareSanskar — Nepal Markets, Daily",
    description: "Live NEPSE coverage, market analysis, IPO updates, and investment journalism for Nepal.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&f[]=supreme@700,800,900&display=swap"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${azeretMono.variable} antialiased text-gray-900 bg-white`}
      >
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
