import Link from "next/link";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View All →",
}: SectionHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-8 pb-3 border-b-2 border-black">
      <div className="max-w-2xl">
        <p className="eyebrow section-rule">{eyebrow}</p>
        <h2 className="headline-xl text-gray-900 mt-3">{title}</h2>
        {description && (
          <p className="lead mt-3 text-gray-500 text-[0.9375rem]">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="nav-link text-gray-500 hover:text-[#d32027] transition-colors whitespace-nowrap"
        >
          {hrefLabel}
        </Link>
      )}
    </header>
  );
}
