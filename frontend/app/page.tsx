import { Suspense } from "react";
import StockTicker from "@/components/StockTicker";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import NewsSection from "@/components/NewsSection";
import YouTubeSection from "@/components/YouTubeSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import MoreNews from "@/components/MoreNews";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stock Ticker */}
      <StockTicker />

      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section with Chart */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <HeroSection />
        </div>

        {/* News Section */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Suspense fallback={<div className="py-10" />}>
            <NewsSection />
          </Suspense>
        </div>

        {/* YouTube Section */}
        <YouTubeSection />

        {/* Subscription Section */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <SubscriptionSection />
        </div>

        {/* More News / Featured Articles */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Suspense fallback={<div className="py-10" />}>
            <MoreNews />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
