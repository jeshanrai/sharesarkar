import type { Metadata } from "next";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import ArticleClient from "./ArticleClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ServerArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  image_url: string;
  category: string;
  categories: string[];
  tags: string[];
  section: string;
  read_time: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  canonical_url: string;
  noindex: boolean;
  related: unknown[];
}

/**
 * Fetch the article server-side. We use Next's fetch cache with a short
 * revalidation window so refreshes after an edit show up quickly without
 * hammering the API on every page view. The same call powers
 * generateMetadata and the page render — Next dedupes them automatically.
 */
async function fetchArticle(idOrSlug: string): Promise<ServerArticle | null> {
  try {
    const res = await fetch(`${API_URL}/api/news/${idOrSlug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerArticle;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const article = await fetchArticle(id);
  if (!article) {
    return { title: "Article not found · ShareSanskar" };
  }

  const title = (article.meta_title && article.meta_title.trim()) || article.title;
  const description =
    (article.meta_description && article.meta_description.trim()) || article.excerpt;
  const ogImage =
    (article.og_image_url && article.og_image_url.trim()) ||
    resolveImageUrl(article.image_url) ||
    undefined;
  const canonical = article.canonical_url && article.canonical_url.trim()
    ? article.canonical_url
    : undefined;
  const robots = article.noindex
    ? { index: false, follow: false }
    : undefined;

  // Keywords come from the union of categories + tags so search engines pick
  // up the article's full taxonomy. Keep the list short — Google ignores
  // long ones, and over-stuffing reads as spammy.
  const keywords = Array.from(
    new Set([...(article.categories || []), ...(article.tags || [])])
  ).slice(0, 12);

  return {
    title: `${title} · ShareSanskar`,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: canonical ? { canonical } : undefined,
    robots,
    openGraph: {
      type: "article",
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
      authors: article.author ? [article.author] : undefined,
      tags: article.tags && article.tags.length > 0 ? article.tags : undefined,
      siteName: "ShareSanskar",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ArticlePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await fetchArticle(id);
  // Cast: the client expects its narrower shape; the extra SEO fields on
  // ServerArticle are harmless to pass along.
  return (
    <ArticleClient
      idOrSlug={id}
      initialArticle={article as unknown as Parameters<typeof ArticleClient>[0]["initialArticle"]}
    />
  );
}
