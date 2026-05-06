import Link from "next/link";

interface ComingSoonProps {
  title?: string;
  subtitle?: string;
  showHomeLink?: boolean;
}

export default function ComingSoon({
  title = "Coming Soon",
  subtitle,
  showHomeLink = true,
}: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24">
      <div className="text-center max-w-2xl">
        <p className="eyebrow text-[#d32027] mb-6 inline-block section-rule">ShareSanskar</p>
        <h1 className="font-serif font-extrabold text-5xl md:text-7xl text-gray-900 tracking-tight leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
        {showHomeLink && (
          <div className="mt-10">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white text-xs font-semibold tracking-widest uppercase hover:bg-[#d32027] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
