import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShareSanskar - Nepal Stock Market News & Analysis",
  description: "Your trusted source for Nepal stock market news, NEPSE analysis, IPO updates, and investment insights. Get real-time market data, technical analysis, and expert recommendations.",
  keywords: "NEPSE, Nepal Stock Exchange, Nepal stocks, stock market, IPO Nepal, share market, trading, investment",
  openGraph: {
    title: "ShareSanskar - Nepal Stock Market News & Analysis",
    description: "Your trusted source for Nepal stock market news, NEPSE analysis, IPO updates, and investment insights.",
    type: "website",
    locale: "en_US",
    siteName: "ShareSanskar",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShareSanskar - Nepal Stock Market News & Analysis",
    description: "Your trusted source for Nepal stock market news, NEPSE analysis, IPO updates, and investment insights.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
