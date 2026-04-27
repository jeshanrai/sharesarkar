import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";

export default function TechnicalPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <ComingSoon
          title="Coming Soon"
          subtitle="RSI, MACD, support/resistance and buy/sell signals for every NEPSE script — under development."
        />
      </main>
      <Footer />
    </div>
  );
}
