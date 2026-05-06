"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Upload, Link as LinkIcon, X } from "lucide-react";

interface ImagePickerProps {
  value: string;
  onChange: (next: string) => void;
  /** Max upload size in MB. Defaults to 4. */
  maxSizeMB?: number;
}

type Tab = "url" | "upload";

export default function ImagePicker({ value, onChange, maxSizeMB = 4 }: ImagePickerProps) {
  // Default tab: if the existing value is a data: URL, start on the upload tab.
  const [tab, setTab] = useState<Tab>(value.startsWith("data:") ? "upload" : "url");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If the value flips between URL <-> data URL externally, follow it.
  useEffect(() => {
    if (value.startsWith("data:") && tab !== "upload") setTab("upload");
  }, [value, tab]);

  function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, GIF).");
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Image is ${sizeMB.toFixed(1)} MB — limit is ${maxSizeMB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onChange(result);
    };
    reader.onerror = () => setError("Could not read this file.");
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clear() {
    onChange("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        <ImageIcon className="w-4 h-4 inline mr-1" /> Featured Image
      </label>

      {/* Tabs */}
      <div className="inline-flex p-0.5 bg-gray-100 rounded-lg mb-3 text-xs font-medium">
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

      {/* URL input */}
      {tab === "url" && (
        <input
          type="url"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.unsplash.com/..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#009429]/20 focus:border-[#009429]"
        />
      )}

      {/* Upload zone */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-[#009429] hover:bg-[#009429]/5 rounded-xl px-4 py-8 text-center transition-colors"
        >
          <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-700 font-medium">Click to upload or drag &amp; drop</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP, GIF · up to {maxSizeMB} MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      {/* Preview */}
      {value && (
        <div className="mt-3">
          <div className="relative h-44 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-red-600 rounded-full shadow-sm transition-colors"
              title="Remove image"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {value.startsWith("data:") && (
            <p className="text-[11px] text-gray-400 mt-2">
              Stored inline (base64). For very large images, consider hosting externally and pasting the URL.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
