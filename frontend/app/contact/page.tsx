import PageLayout from "@/components/PageLayout";
import Link from "next/link";

export const metadata = {
  title: "Contact Us | ShareSanskar",
  description:
    "Get in touch with ShareSanskar for news tips, advertising inquiries, partnership proposals, and general feedback.",
};

export default function ContactPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <p className="eyebrow text-[#d32027] section-rule inline-flex mb-4">
          Get In Touch
        </p>
        <h1 className="headline-xl text-gray-900 mb-6">Contact Us</h1>
        <p className="lead text-gray-600 mb-12">
          Have a question, news tip, or business inquiry? We&apos;d love to hear
          from you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="headline-md text-gray-900 mb-6">
                Reach Us Directly
              </h2>
              <div className="space-y-5">
                <div>
                  <p className="eyebrow text-gray-500 mb-1">Email</p>
                  <a
                    href="mailto:Marketing@sharesanskar.com"
                    className="text-gray-900 hover:text-[#d32027] transition-colors"
                  >
                    Marketing@sharesanskar.com
                  </a>
                </div>
                <div>
                  <p className="eyebrow text-gray-500 mb-1">Phone</p>
                  <a
                    href="tel:9802857611"
                    className="text-gray-900 hover:text-[#d32027] transition-colors"
                  >
                    9802857611
                  </a>
                </div>
                <div>
                  <p className="eyebrow text-gray-500 mb-1">Location</p>
                  <p className="text-gray-900">Ramshah path, Kathmandu</p>
                </div>
                <div>
                  <p className="eyebrow text-gray-500 mb-1">Office Hours</p>
                  <p className="text-gray-900">
                    Sunday – Friday, 10:00 AM – 5:00 PM (NPT)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Follow Us</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: "Facebook", href: "https://www.facebook.com/sanskarshare" },
                  { name: "YouTube", href: "https://youtube.com/@sharesanskar" },
                  { name: "Instagram", href: "https://www.instagram.com/sharesanskar" },
                  { name: "TikTok", href: "https://www.tiktok.com/@sharesanskar" },
                  { name: "LinkedIn", href: "https://linkedin.com/company/sharesanskar" },
                ].map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta px-3 py-1 border border-gray-200 text-gray-700 hover:border-[#d32027] hover:text-[#d32027] transition-colors"
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Inquiry Types */}
          <div>
            <h2 className="headline-md text-gray-900 mb-6">How Can We Help?</h2>
            <div className="space-y-4">
              {[
                {
                  title: "News Tips & Story Ideas",
                  desc: "Got a market tip or story lead? Email us with details and our editorial team will review it.",
                  email: "Marketing@sharesanskar.com",
                },
                {
                  title: "Advertising & Sponsorship",
                  desc: "Interested in reaching Nepal's most engaged investor audience? Check out our advertising options.",
                  link: "/advertise",
                },
                {
                  title: "Technical Issues",
                  desc: "Found a bug or having trouble with the website? Let us know and we'll fix it promptly.",
                  email: "Marketing@sharesanskar.com",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="border border-gray-200 p-4 sm:p-5 hover:border-brand-green/40 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{item.desc}</p>
                  {item.email && (
                    <a href={`mailto:${item.email}`} className="meta text-[#d32027] hover:underline">{item.email}</a>
                  )}
                  {item.link && (
                    <Link href={item.link} className="meta text-[#d32027] hover:underline">View advertising options →</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
