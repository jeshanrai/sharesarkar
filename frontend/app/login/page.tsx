import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoon from "@/components/ComingSoon";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <ComingSoon
          title="Coming Soon"
          subtitle="User accounts and personalised watchlists are on the way. For admin access, use /admin/login."
        />
      </main>
      <Footer />
    </div>
  );
}
