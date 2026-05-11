import PageLayout from "@/components/PageLayout";

export const metadata = {
  title: "Terms of Service | ShareSanskar",
  description: "Terms and conditions governing the use of ShareSanskar website and services.",
};

export default function TermsPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl sm:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <p className="eyebrow text-[#d32027] section-rule inline-flex mb-4">Legal</p>
        <h1 className="headline-xl text-gray-900 mb-6">Terms of Service</h1>
        <p className="meta text-gray-500 mb-12">Last updated: May 10, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="headline-sm text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using the ShareSanskar website, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">2. Description of Service</h2>
            <p>ShareSanskar is a media platform providing Nepal stock market news, analysis, live market data, financial education, and related content. Our services are provided for informational and educational purposes only.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">3. Investment Disclaimer</h2>
            <p><strong>ShareSanskar does not provide investment advice.</strong> All content published on this platform - including articles, analysis, videos, and market data - is for informational purposes only and should not be construed as financial advice. Stock market investments are subject to market risks. Always consult a licensed financial advisor before making investment decisions.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">4. User Accounts</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must provide accurate information when creating an account or subscribing.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">5. Intellectual Property</h2>
            <p>All content on ShareSanskar - including text, graphics, logos, images, videos, and software - is the property of ShareSanskar or its content creators and is protected by copyright laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="space-y-2 list-disc list-inside mt-2">
              <li>Use our services for any unlawful purpose</li>
              <li>Scrape, crawl, or harvest content without permission</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Distribute spam or misleading information through our platform</li>
              <li>Interfere with the proper functioning of the website</li>
            </ul>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">7. Market Data Accuracy</h2>
            <p>While we strive to provide accurate and timely market data, ShareSanskar does not guarantee the completeness or accuracy of any information displayed. Market data may be delayed or contain errors. Always verify critical information with official NEPSE sources.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p>ShareSanskar shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of our website or reliance on any information provided. This includes, but is not limited to, financial losses from investment decisions made based on our content.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">9. Third-Party Links</h2>
            <p>Our website may contain links to third-party sites. We are not responsible for the content, accuracy, or practices of these external websites.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">10. Modifications</h2>
            <p>We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of the website constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">11. Governing Law</h2>
            <p>These terms shall be governed by and construed in accordance with the laws of Nepal. Any disputes shall be subject to the jurisdiction of the courts in Kathmandu, Nepal.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">12. Contact</h2>
            <p>For questions regarding these Terms of Service, contact us at:</p>
            <div className="mt-3 space-y-2 text-gray-700">
              <p><strong>Email:</strong> <a href="mailto:Marketing@sharesanskar.com" className="text-[#d32027] hover:underline">Marketing@sharesanskar.com</a></p>
              <p><strong>Phone:</strong> <a href="tel:9802857611" className="text-[#d32027] hover:underline">9802857611</a></p>
              <p><strong>Address:</strong> Ramshah path, Kathmandu</p>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
