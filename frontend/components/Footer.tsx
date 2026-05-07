"use client";

import { useState } from "react";
import Link from "next/link";

const footerLinks = {
  market: [
    { label: "Live Market", href: "/market" },
    { label: "Indices", href: "/indices" },
    { label: "Top Gainers", href: "/gainers" },
    { label: "Top Losers", href: "/losers" },
    { label: "Floorsheet", href: "/floorsheet" },
  ],
  learn: [
    { label: "Trading Basics", href: "/learn/basics" },
    { label: "Technical Analysis", href: "/learn/technical" },
    { label: "Fundamental Analysis", href: "/learn/fundamental" },
    { label: "IPO Guide", href: "/learn/ipo" },
    { label: "Mutual Funds", href: "/learn/mutual-funds" },
  ],
  tools: [
    { label: "Stock Screener", href: "/screener" },
    { label: "IPO Calculator", href: "/ipo-calculator" },
    { label: "Dividend Calculator", href: "/dividend-calculator" },
    { label: "Compare Stocks", href: "/compare" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Advertise", href: "/advertise" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/sanskarshare",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com/@sharesanskar",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/sharesanskar?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.849.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.265.07 1.645.07 4.849s-.012 3.584-.07 4.849c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.265.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.849c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.775.13 4.602.396 3.635 1.363 2.668 2.33 2.402 3.503 2.344 4.78 2.286 6.06 2.272 6.469 2.272 9.728c0 3.259.014 3.668.072 4.948.058 1.277.324 2.45 1.291 3.417.967.967 2.14 1.233 3.417 1.291 1.28.058 1.689.072 4.948.072s3.668-.014 4.948-.072c1.277-.058 2.45-.324 3.417-1.291.967-.967 1.233-2.14 1.291-3.417.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.058-1.277-.324-2.45-1.291-3.417C19.398.396 18.225.13 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/sharesanskar",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@sharesanskar",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.85a8.16 8.16 0 0 0 4.77 1.52V6.91a4.79 4.79 0 0 1-1.84-.22z" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              {!logoFailed ? (
                <img
                  src="/assets/logos/svg/SS Icon only (Fill).svg"
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-8 object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
              )}
              <div>
                <h3 className="font-bold">ShareSanskar</h3>
              </div>
            </div>
            <p className="footer-text text-gray-400 mb-4">
              Your trusted source for Nepal stock market news and analysis.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="footer-heading mb-3 text-white">Market</h4>
            <ul className="space-y-2">
              {footerLinks.market.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-text text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-heading mb-3 text-white">Learn</h4>
            <ul className="space-y-2">
              {footerLinks.learn.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-text text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-heading mb-3 text-white">Tools</h4>
            <ul className="space-y-2">
              {footerLinks.tools.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-text text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="footer-heading mb-3 text-white">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="footer-text text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="footer-text text-gray-500">
              &copy; {new Date().getFullYear()} ShareSanskar. All rights reserved.
            </p>
            <p className="meta text-gray-600">
              Disclaimer: Stock market investments are subject to market risks.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
