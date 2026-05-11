import PageLayout from "@/components/PageLayout";

export const metadata = {
  title: "Advertise With Us | ShareSanskar",
  description:
    "Reach Nepal's most engaged investor community. Advertise on ShareSanskar - 123K+ followers, daily market coverage, and premium ad placements.",
};

export default function AdvertisePage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <p className="eyebrow text-[#d32027] section-rule inline-flex mb-4">
          Partner With Us
        </p>
        <h1 className="headline-xl text-gray-900 mb-6">
          Advertise on ShareSanskar
        </h1>
        <p className="lead text-gray-600 mb-12">
          Put your brand in front of Nepal&apos;s most active investors and
          market enthusiasts.
        </p>

        {/* Audience Stats */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">Our Audience</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { stat: "123K+", label: "Social Followers" },
              { stat: "50K+", label: "Monthly Readers" },
              { stat: "1M+", label: "Monthly Impressions" },
              { stat: "85%", label: "Nepal-Based Audience" },
            ].map((item) => (
              <div
                key={item.label}
                className="text-center border border-gray-200 p-4 sm:p-5"
              >
                <p className="text-2xl font-bold text-gray-900">{item.stat}</p>
                <p className="meta text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who Should Advertise */}
        <section className="mb-16">
          <h2 className="headline-md text-gray-900 mb-6">Who Should Advertise?</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              ShareSanskar is an ideal platform for businesses seeking
              visibility among Nepal&apos;s financially engaged audience and
              the wider public. Beyond investor-focused brands, retailers,
              service providers, and consumer-facing companies can showcase
              their brand in our articles and newsletter placements to reach
              readers who actively follow market news and business content.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200 pt-10 text-center">
          <h2 className="headline-md text-gray-900 mb-3">Ready to get started?</h2>
          <p className="text-gray-600 mb-6">
            Get in touch to discuss advertising opportunities with ShareSanskar.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:Marketing@sharesanskar.com?subject=Advertising%20Inquiry"
              className="btn-text inline-block px-8 py-3 bg-black text-white hover:bg-[#d32027] transition-colors"
            >
              Email Us: Marketing@sharesanskar.com
            </a>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600 mb-3">Or reach us directly:</p>
              <div className="space-y-2 text-gray-700">
                <p>
                  <strong>Phone:</strong>{" "}
                  <a href="tel:9802857611" className="text-[#d32027] hover:underline">
                    9802857611
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> Ramshah path, Kathmandu
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
