import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";

export default function MutualFundsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <ComingSoon
          title="Coming Soon"
          subtitle="Live NAV, AUM, and performance for every mutual fund listed on NEPSE — landing here soon."
        />
      </main>
      <Footer />
    </div>
  );
}
