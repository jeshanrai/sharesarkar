import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <ComingSoon
          title="Coming Soon"
          subtitle="This page isn't ready yet — but it will be soon. Head back to the homepage for live markets and the latest news."
        />
      </main>
      <Footer />
    </div>
  );
}
