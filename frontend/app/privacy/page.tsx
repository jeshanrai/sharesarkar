import PageLayout from "@/components/PageLayout";

export const metadata = {
  title: "Privacy Policy | ShareSanskar",
  description: "How ShareSanskar collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className="max-w-3xl sm:max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <p className="eyebrow text-[#d32027] section-rule inline-flex mb-4">Legal</p>
        <h1 className="headline-xl text-gray-900 mb-6">Privacy Policy</h1>
        <p className="meta text-gray-500 mb-12">Last updated: May 10, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="headline-sm text-gray-900 mb-4">1. Introduction</h2>
            <p>ShareSanskar is a media company based in Kathmandu, Nepal, dedicated to providing Nepal stock market news, analysis, and financial education. This Privacy Policy explains how we collect, use, and safeguard your information.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">2. Information We Collect</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong>Personal Information:</strong> Name and email when you subscribe to our newsletter.</li>
              <li><strong>Usage Data:</strong> Pages visited, browser type, device type, and referring URLs.</li>
              <li><strong>Saved Preferences:</strong> Articles you save and portfolio watchlists stored locally in your browser.</li>
            </ul>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Deliver and improve our news and market data services</li>
              <li>Send newsletter updates to subscribed users</li>
              <li>Analyze site traffic to improve content</li>
              <li>Display relevant advertisements</li>
              <li>Respond to inquiries and support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">4. Cookies &amp; Local Storage</h2>
            <p>We use cookies and browser local storage to remember saved articles, authentication sessions, and display preferences. You can clear these at any time through your browser settings.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">5. Third-Party Services</h2>
            <p>Our website may contain links to third-party websites (e.g., brokerage firms, NEPSE). We are not responsible for their privacy practices and recommend reviewing their policies independently.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">6. Advertising</h2>
            <p>We display advertisements on our platform. Advertisers may use cookies to serve ads. ShareSanskar does not share your personal information directly with advertisers.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">7. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">8. Your Rights</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Unsubscribe from our newsletter at any time</li>
              <li>Clear locally stored data through your browser</li>
            </ul>
          </section>

          <section>
            <h2 className="headline-sm text-gray-900 mb-4">9. Contact</h2>
            <p>If you have questions about this Privacy Policy, contact us at:</p>
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
