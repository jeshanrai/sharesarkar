import PageLayout from "@/components/PageLayout";
import Link from "next/link";

export const metadata = {
  title: "About Us | ShareSanskar",
  description:
    "ShareSanskar is a media company established to spread the authenticity of the Capital Market of Nepal and financial updates.",
};

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        {/* Heading */}
        <p className="eyebrow text-[#d32027] section-rule inline-flex mb-4">
          Company
        </p>
        <h1 className="headline-xl text-gray-900 mb-6">About ShareSanskar</h1>
        <p className="lead text-gray-600 mb-12">
          Your trusted source for Nepal stock market news, analysis, and
          financial literacy.
        </p>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">Our Mission</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              ShareSanskar is a media company established to spread the
              authenticity of the Capital Market of Nepal and provide timely
              financial updates to investors, traders, and anyone interested in
              understanding the Nepali economy.
            </p>
            <p>
              Founded in Kathmandu, we believe that access to accurate,
              easy-to-understand financial information should not be a privilege.
              Our mission is to democratize stock market knowledge across Nepal -
              breaking down complex financial data into actionable insights that
              empower everyday Nepalis to make informed investment decisions.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Market News & Analysis",
                desc: "Real-time NEPSE coverage, sector analysis, and breaking market news delivered as it happens.",
              },
              {
                title: "Financial Education",
                desc: "Educational content on trading basics, technical analysis, fundamental analysis, IPOs, and mutual funds.",
              },
              {
                title: "Live Market Data",
                desc: "Live stock prices, index tracking, top gainers and losers, and sector performance data.",
              },
              {
                title: "Video Content",
                desc: "In-depth video analysis, market commentary, and educational series on our YouTube channel.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-gray-200 p-4 sm:p-6 hover:border-brand-green/40 transition-colors"
              >
                <h3 className="headline-sm text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Community */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">Our Community</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              With a growing community of over{" "}
              <strong>123,000+ followers </strong> across Facebook, YouTube,
              Instagram, TikTok, and LinkedIn, ShareSanskar has become one of
              Nepal&apos;s most trusted voices in capital market journalism. Every
              day, thousands of Nepalis rely on ShareSanskar for their daily dose
              of market intelligence.
            </p>
            <p>
              Whether you are a seasoned investor tracking NEPSE movements or a
              beginner learning the difference between a bull and a bear market,
              ShareSanskar is here to guide your financial journey.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Authenticity",
                desc: "We verify every piece of information before publishing. Trust is the foundation of everything we do.",
              },
              {
                title: "Accessibility",
                desc: "Financial knowledge should be for everyone. We deliver content in clear, simple language - in both Nepali and English.",
              },
              {
                title: "Timeliness",
                desc: "Markets move fast. Our team works around the clock to deliver news and analysis the moment it matters.",
              },
            ].map((v) => (
              <div key={v.title} className="text-center">
                <h3 className="headline-sm text-gray-900 mb-3">{v.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200 pt-10 text-center">
          <h2 className="headline-md text-gray-900 mb-3">
            Want to work with us?
          </h2>
          <p className="text-gray-600 mb-6">
            Reach out to collaborate, advertise, or just say hello.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="btn-text px-6 py-2.5 bg-black text-white hover:bg-[#d32027] transition-colors"
            >
              Contact Us
            </Link>
            <Link
              href="/advertise"
              className="btn-text px-6 py-2.5 border border-gray-300 text-gray-700 hover:border-brand-green hover:text-brand-green transition-colors"
            >
              Advertise With Us
            </Link>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
