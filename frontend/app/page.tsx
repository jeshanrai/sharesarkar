import { Suspense } from "react";
import StockTicker from "@/components/StockTicker";
import LiveIndexStrip from "@/components/LiveIndexStrip";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarketOverview from "@/components/MarketOverview";
import NewsSection from "@/components/NewsSection";
import YouTubeSection from "@/components/YouTubeSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import MoreNews from "@/components/MoreNews";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top: live index strip → nav → individual stock ticker */}
      <LiveIndexStrip />
      <Navbar />
      <StockTicker />

      <main id="main" tabIndex={-1}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <HeroSection />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <MarketOverview />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Suspense fallback={<div className="py-10" />}>
            <NewsSection />
          </Suspense>
        </div>

        <YouTubeSection />

        <div id="subscribe" className="max-w-7xl mx-auto px-4 lg:px-8 scroll-mt-32">
          <SubscriptionSection />
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Suspense fallback={<div className="py-10" />}>
            <MoreNews />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
