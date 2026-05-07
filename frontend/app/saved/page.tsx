"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { useSavedStories, type SavedStory } from "@/lib/useSavedStories";
import { resolveImageUrl, isBackendMedia } from "@/lib/resolveImageUrl";
import { Bookmark, BookmarkX, Trash2, ArrowRight, Clock, Image as ImageIcon } from "lucide-react";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const diffMs = Date.now() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const d = Math.floor(diffHrs / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SavedPage() {
  const { items, hydrated, remove, clearAll } = useSavedStories();
  const [toast, setToast] = useState({ msg: "", trigger: 0 });
  // null = closed, "all" = clear-all flow, otherwise the story being removed.
  const [pendingDelete, setPendingDelete] = useState<SavedStory | "all" | null>(null);

  function handleRemove(story: SavedStory) {
    remove(story);
    setToast({ msg: "Removed from Read Later", trigger: Date.now() });
  }

  function confirmClearAll() {
    if (items.length === 0) return;
    setPendingDelete("all");
  }

  function executePending() {
    if (pendingDelete === "all") {
      clearAll();
      setToast({ msg: "Cleared all saved stories", trigger: Date.now() });
    } else if (pendingDelete) {
      handleRemove(pendingDelete);
    }
    setPendingDelete(null);
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <Breadcrumb items={[{ label: "Read Later" }]} />

        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="headline-lg text-gray-900 mb-2">Read Later</h1>
            <p className="text-gray-500 meta">
              {hydrated && items.length > 0
                ? `${items.length} saved ${items.length === 1 ? "story" : "stories"} on this device`
                : "Stories you save show up here, on this device only."}
            </p>
          </div>
          {hydrated && items.length > 0 && (
            <button
              type="button"
              onClick={confirmClearAll}
              className="inline-flex items-center gap-2 px-3 py-2 eyebrow text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          )}
        </div>

        {!hydrated ? (
          // Tiny skeleton — localStorage reads happen post-mount.
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-100 animate-pulse" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-gray-50/40">
            <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <h3 className="headline-sm text-gray-700 mb-1">Nothing saved yet</h3>
            <p className="meta text-gray-500 mb-6 max-w-sm mx-auto">
              Tap the <span className="inline-flex items-center gap-1 align-middle"><Bookmark className="w-3.5 h-3.5" /> Save Story</span> button on any article and it&apos;ll show up here.
            </p>
            <Link
              href="/news"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#009429] text-white meta hover:bg-[#007a22] transition-colors"
            >
              Browse latest news <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {items.map((item) => (
              <article
                key={`${item.slug || item.id}`}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all flex flex-col"
              >
                <Link href={`/news/${item.slug || item.id}`} className="block group">
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    {(() => {
                      const src = resolveImageUrl(item.image_url);
                      return src ? (
                        <Image
                          src={src}
                          alt={item.title}
                          fill
                          unoptimized={isBackendMedia(src)}
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      );
                    })()}
                    {item.category && (
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-gray-900/80 backdrop-blur-sm text-white eyebrow rounded-full">
                        {item.category}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="p-5 flex-1 flex flex-col">
                  <Link href={`/news/${item.slug || item.id}`} className="group">
                    <h3 className="headline-sm text-gray-900 group-hover:text-[#d32027] transition-colors line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                  </Link>
                  {item.excerpt && (
                    <p className="meta text-gray-500 line-clamp-2 mb-3">{item.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Saved {timeAgo(item.saved_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 -mr-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      aria-label={`Remove "${item.title}" from saved`}
                      title="Remove from saved"
                    >
                      <BookmarkX className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast.msg} trigger={toast.trigger} />
      <ConfirmModal
        open={pendingDelete !== null}
        variant="danger"
        title={pendingDelete === "all" ? "Clear all saved stories?" : "Remove this story?"}
        message={
          pendingDelete === "all" ? (
            <>
              You&apos;ll lose access to <span className="font-semibold text-gray-900">{items.length}</span>{" "}
              saved {items.length === 1 ? "story" : "stories"} on this device. This can&apos;t be undone.
            </>
          ) : pendingDelete ? (
            <>
              <span className="font-semibold text-gray-900 line-clamp-2">{pendingDelete.title}</span>
              <span className="block mt-1">It will be removed from your Read Later list on this device.</span>
            </>
          ) : null
        }
        confirmLabel={pendingDelete === "all" ? "Clear all" : "Remove"}
        cancelLabel="Keep"
        onConfirm={executePending}
        onCancel={() => setPendingDelete(null)}
      />
    </PageLayout>
  );
}
