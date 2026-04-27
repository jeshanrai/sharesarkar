import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <h1 className="font-serif font-black text-5xl md:text-7xl text-gray-900 text-center tracking-tight">
          Coming Soon
        </h1>
      </main>
      <Footer />
    </div>
  );
}
