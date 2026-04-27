import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
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
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} antialiased text-gray-900 bg-white`}>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
