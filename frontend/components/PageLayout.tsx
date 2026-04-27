import StockTicker from "@/components/StockTicker";
import LiveIndexStrip from "@/components/LiveIndexStrip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <LiveIndexStrip />
      <Navbar />
      <StockTicker />
      <main id="main" tabIndex={-1} className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
