"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Undo2,
  Redo2,
  RemoveFormatting,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import { MediaLibraryDialog } from "@/components/admin/MediaPicker";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /**
   * Cap for inline video uploads (base64). Default 1 MB — videos quickly
   * overflow the article content budget; recommend using the URL tab
   * (YouTube / Vimeo embed) instead.
   *
   * Note: image inserts no longer take a base64 cap — they go through the
   * media library, which writes to disk and returns a URL. The 5 MB upload
   * limit and full validation pipeline are enforced server-side.
   */
  videoMaxMB?: number;
}

type Cmd =
  | "bold"
  | "italic"
  | "underline"
  | "formatBlock"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "createLink"
  | "unlink"
  | "insertImage"
  | "insertHTML"
  | "removeFormat"
  | "undo"
  | "redo";

type ModalKind = null | "image" | "video";

// ── Helpers ─────────────────────────────────────────────────────

const RTE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Library URLs come back as `/uploads/<key>` relative paths. Inline article
 * HTML is rendered on a different origin (Next.js front-end), so resolve to
 * an absolute URL before inserting — otherwise the browser tries to fetch
 * the image from the front-end origin, which won't have it.
 */
function absoluteMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  return `${RTE_API_URL.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Unexpected reader result"));
    };
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Detect a YouTube/Vimeo URL and return an embeddable iframe URL.
 * Returns null when the URL doesn't match a known provider — caller falls
 * back to a plain <video src> tag.
 */
function getEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube — supports /watch?v=, youtu.be/, /shorts/, /embed/
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      let id = "";
      if (host === "youtu.be") id = u.pathname.slice(1);
      else if (u.pathname.startsWith("/watch")) id = u.searchParams.get("v") || "";
      else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] || "";
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] || "";
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Vimeo — vimeo.com/{id}
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

// ── Component ───────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your article…",
  minHeight = 360,
  videoMaxMB = 1,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  // The top-level block currently containing the cursor — drives the
  // contextual block-actions toolbar (delete / move / duplicate).
  const [activeBlock, setActiveBlock] = useState<HTMLElement | null>(null);

  // Push value into the editor when it changes from outside (e.g. async load).
  // We avoid resetting innerHTML on every keystroke — only when the incoming
  // value differs from what's already rendered.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if ((value || "") !== el.innerHTML) {
      el.innerHTML = value || "";
      setIsEmpty(!el.textContent?.trim());
    }
  }, [value]);

  // Walk up from `node` until we hit a direct child of the editor — that
  // direct child is the "block" the cursor is in (a <p>, <h2>, <ul>, image
  // wrapper, video embed, etc.).
  function findTopLevelBlock(node: Node | null): HTMLElement | null {
    const editor = editorRef.current;
    if (!editor || !node || !editor.contains(node)) return null;
    let cur: Node | null = node;
    while (cur && cur.parentNode !== editor) cur = cur.parentNode;
    return cur instanceof HTMLElement ? cur : null;
  }

  // Remember the current selection so we can restore it after the modal closes
  // (otherwise focus jumps out of the editor and insertions land at the start).
  // Also tracks which top-level block the caret is in.
  function rememberSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const editor = editorRef.current;
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
        setActiveBlock(findTopLevelBlock(range.commonAncestorContainer));
      }
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = savedRangeRef.current;
    if (range) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  const exec = useCallback(
    (command: Cmd, arg?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false, arg);
      onChange(el.innerHTML);
      setIsEmpty(!el.textContent?.trim());
    },
    [onChange]
  );

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
    setIsEmpty(!el.textContent?.trim());
    rememberSelection();
  }

  // Apply / remove the active-block outline as the caret moves.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    Array.from(editor.querySelectorAll(".rte-block-active")).forEach((n) =>
      n.classList.remove("rte-block-active")
    );
    if (activeBlock && editor.contains(activeBlock)) {
      activeBlock.classList.add("rte-block-active");
    }
  }, [activeBlock]);

  // ── Block-level actions (delete / move / duplicate) ───────────
  // All operate on the currently-active top-level block.

  function placeCaretInside(el: HTMLElement) {
    const editor = editorRef.current;
    if (!editor || !editor.contains(el)) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    editor.focus();
    setActiveBlock(el);
  }

  function deleteActiveBlock() {
    const el = editorRef.current;
    const block = activeBlock;
    if (!el || !block || !el.contains(block)) return;
    const fallback = (block.previousElementSibling || block.nextElementSibling) as HTMLElement | null;
    block.remove();
    if (fallback) placeCaretInside(fallback);
    else setActiveBlock(null);
    onChange(el.innerHTML);
    setIsEmpty(!el.textContent?.trim());
  }

  function moveActiveBlock(direction: "up" | "down") {
    const el = editorRef.current;
    const block = activeBlock;
    if (!el || !block || !el.contains(block)) return;
    if (direction === "up") {
      const prev = block.previousElementSibling;
      if (prev) el.insertBefore(block, prev);
    } else {
      const next = block.nextElementSibling;
      if (next) el.insertBefore(next, block);
    }
    onChange(el.innerHTML);
    placeCaretInside(block);
  }

  function duplicateActiveBlock() {
    const el = editorRef.current;
    const block = activeBlock;
    if (!el || !block || !el.contains(block)) return;
    const clone = block.cloneNode(true) as HTMLElement;
    block.after(clone);
    onChange(el.innerHTML);
    placeCaretInside(clone);
  }

  const blockActionsAvailable = !!activeBlock;
  const canMoveUp = !!activeBlock?.previousElementSibling;
  const canMoveDown = !!activeBlock?.nextElementSibling;

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  function promptLink() {
    const url = window.prompt("Enter URL (include https://)");
    if (!url) return;
    exec("createLink", url);
  }

  function openImageModal() {
    rememberSelection();
    setModal("image");
  }

  function openVideoModal() {
    rememberSelection();
    setModal("video");
  }

  function closeModal() {
    setModal(null);
    // Defer focus so React commits modal unmount first.
    setTimeout(restoreSelection, 0);
  }

  function insertImage(src: string) {
    if (!src) return;
    restoreSelection();
    exec("insertImage", src);
    setModal(null);
  }

  function insertVideoHtml(html: string) {
    if (!html) return;
    restoreSelection();
    exec("insertHTML", html);
    setModal(null);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#009429]/20 focus-within:border-[#009429] transition-shadow">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-gray-100 bg-gray-50/60">
        <ToolButton title="Bold (Ctrl+B)" onClick={() => exec("bold")}>
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Italic (Ctrl+I)" onClick={() => exec("italic")}>
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Underline (Ctrl+U)" onClick={() => exec("underline")}>
          <Underline className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Heading 2" onClick={() => exec("formatBlock", "H2")}>
          <Heading2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Heading 3" onClick={() => exec("formatBlock", "H3")}>
          <Heading3 className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Paragraph" onClick={() => exec("formatBlock", "P")}>
          <span className="text-[11px] font-semibold tracking-wide">P</span>
        </ToolButton>
        <ToolButton title="Quote" onClick={() => exec("formatBlock", "BLOCKQUOTE")}>
          <Quote className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Bulleted list" onClick={() => exec("insertUnorderedList")}>
          <List className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Insert link" onClick={promptLink}>
          <LinkIcon className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Insert image (URL or upload)" onClick={openImageModal}>
          <ImageIcon className="w-4 h-4" />
        </ToolButton>
        <ToolButton title="Insert video (URL or upload)" onClick={openVideoModal}>
          <VideoIcon className="w-4 h-4" />
        </ToolButton>
        <Divider />
        <ToolButton title="Clear formatting" onClick={() => exec("removeFormat")}>
          <RemoveFormatting className="w-4 h-4" />
        </ToolButton>
        <Divider />
        {/* Block actions — operate on the block where the cursor is */}
        <ToolButton
          title="Move block up"
          onClick={() => moveActiveBlock("up")}
          disabled={!canMoveUp}
        >
          <ArrowUp className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          title="Move block down"
          onClick={() => moveActiveBlock("down")}
          disabled={!canMoveDown}
        >
          <ArrowDown className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          title="Duplicate block"
          onClick={duplicateActiveBlock}
          disabled={!blockActionsAvailable}
        >
          <Copy className="w-4 h-4" />
        </ToolButton>
        <ToolButton
          title="Delete block"
          onClick={deleteActiveBlock}
          disabled={!blockActionsAvailable}
          danger
        >
          <Trash2 className="w-4 h-4" />
        </ToolButton>
        <div className="ml-auto flex items-center gap-1">
          <ToolButton title="Undo" onClick={() => exec("undo")}>
            <Undo2 className="w-4 h-4" />
          </ToolButton>
          <ToolButton title="Redo" onClick={() => exec("redo")}>
            <Redo2 className="w-4 h-4" />
          </ToolButton>
        </div>
      </div>

      {activeBlock && (
        <div className="px-4 py-1.5 border-b border-gray-100 bg-[#009429]/5 text-[11px] text-gray-600 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#009429]" />
          Editing <span className="font-mono text-[10px] text-gray-700">&lt;{activeBlock.tagName.toLowerCase()}&gt;</span> block — use the toolbar to move, duplicate, or delete it.
        </div>
      )}

      {/* Editable surface */}
      <div className="relative">
        {isEmpty && (
          <p className="absolute top-4 left-4 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          onPaste={handlePaste}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          className="prose-editorial-edit px-4 py-3 text-sm text-gray-800 outline-none"
          style={{ minHeight }}
        />
      </div>

      {modal === "image" && (
        <MediaLibraryDialog
          onClose={closeModal}
          onPick={(url) => {
            insertImage(absoluteMediaUrl(url));
          }}
        />
      )}

      {modal === "video" && (
        <MediaModal
          title="Insert video"
          accept="video/*"
          maxMB={videoMaxMB}
          urlPlaceholder="YouTube, Vimeo, or .mp4 URL"
          onCancel={closeModal}
          onSubmitUrl={(url) => {
            const embed = getEmbedSrc(url);
            if (embed) {
              insertVideoHtml(
                `<div class="video-embed"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
              );
            } else {
              // Fallback: assume direct video file URL.
              insertVideoHtml(
                `<video controls preload="metadata" src="${url}"></video>`
              );
            }
          }}
          onSubmitDataUrl={(dataUrl) => {
            insertVideoHtml(`<video controls preload="metadata" src="${dataUrl}"></video>`);
          }}
        />
      )}
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────

function ToolButton({
  title,
  onClick,
  children,
  disabled = false,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  const base =
    "w-8 h-8 inline-flex items-center justify-center rounded-md border border-transparent transition-colors";
  const enabled = danger
    ? "text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
    : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border-gray-200";
  const dimmed = "text-gray-300 cursor-not-allowed";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${base} ${disabled ? dimmed : enabled}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-1" />;
}

interface MediaModalProps {
  title: string;
  accept: string;
  maxMB: number;
  urlPlaceholder: string;
  onCancel: () => void;
  onSubmitUrl: (url: string) => void;
  onSubmitDataUrl: (dataUrl: string) => void;
}

function MediaModal({
  title,
  accept,
  maxMB,
  urlPlaceholder,
  onCancel,
  onSubmitUrl,
  onSubmitDataUrl,
}: MediaModalProps) {
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const isImage = accept.startsWith("image");
    if (isImage && !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (!isImage && !file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) {
      setError(`File is ${sizeMB.toFixed(1)} MB — limit is ${maxMB} MB.`);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      onSubmitDataUrl(dataUrl);
    } catch {
      setError("Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  function submitUrl() {
    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }
    onSubmitUrl(url.trim());
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="inline-flex p-0.5 bg-gray-100 rounded-lg mb-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${tab === "url" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> URL
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${tab === "upload" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload from device
            </button>
          </div>

          {tab === "url" ? (
            <div className="space-y-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={urlPlaceholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
                autoFocus
              />
              <button
                type="button"
                onClick={submitUrl}
                className="w-full py-2.5 bg-[#009429] text-white rounded-lg text-sm font-medium hover:bg-[#007a22] transition-colors"
              >
                Insert
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-[#009429] hover:bg-[#009429]/5 rounded-xl px-4 py-8 text-center transition-colors"
            >
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-700 font-medium">
                {busy ? "Reading file…" : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Max {maxMB} MB</p>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Choose file to upload"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
