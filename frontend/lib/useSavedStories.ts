"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sharesanskar:savedStories";
const MAX_SAVED = 200;

/**
 * Snapshot of an article kept locally so the Saved page can render the
 * card without re-fetching. Slug is the canonical identifier (article id is
 * a fallback for legacy/no-slug articles).
 */
export interface SavedStory {
  id: number;
  slug: string | null;
  title: string;
  excerpt: string;
  image_url: string;
  category: string;
  created_at: string;
  saved_at: string; // ISO timestamp the user hit "Save Story"
}

function readStore(): SavedStory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedStory[]) : [];
  } catch {
    return [];
  }
}

function writeStore(items: SavedStory[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Same-tab listeners need a manual notification — the storage event
    // only fires in OTHER tabs.
    window.dispatchEvent(new CustomEvent("sharesanskar:savedStories"));
  } catch {
    // Quota exceeded or storage disabled — fail silently; the UI will read
    // back the unchanged store on the next render.
  }
}

function keyOf(item: { id: number; slug?: string | null }): string {
  return item.slug ? `slug:${item.slug}` : `id:${item.id}`;
}

export function useSavedStories() {
  const [items, setItems] = useState<SavedStory[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStore());
    setHydrated(true);

    function refresh() {
      setItems(readStore());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("sharesanskar:savedStories", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("sharesanskar:savedStories", refresh);
    };
  }, []);

  const isSaved = useCallback(
    (story: { id: number; slug?: string | null }) => {
      const k = keyOf(story);
      return items.some((s) => keyOf(s) === k);
    },
    [items]
  );

  const save = useCallback((story: Omit<SavedStory, "saved_at">) => {
    const next = readStore();
    const k = keyOf(story);
    if (next.some((s) => keyOf(s) === k)) return; // already saved
    next.unshift({ ...story, saved_at: new Date().toISOString() });
    if (next.length > MAX_SAVED) next.length = MAX_SAVED;
    writeStore(next);
    setItems(next);
  }, []);

  const remove = useCallback((story: { id: number; slug?: string | null }) => {
    const k = keyOf(story);
    const next = readStore().filter((s) => keyOf(s) !== k);
    writeStore(next);
    setItems(next);
  }, []);

  const toggle = useCallback(
    (story: Omit<SavedStory, "saved_at">) => {
      if (isSaved(story)) {
        remove(story);
        return false;
      }
      save(story);
      return true;
    },
    [isSaved, save, remove]
  );

  const clearAll = useCallback(() => {
    writeStore([]);
    setItems([]);
  }, []);

  return { items, hydrated, isSaved, save, remove, toggle, clearAll, count: items.length };
}
