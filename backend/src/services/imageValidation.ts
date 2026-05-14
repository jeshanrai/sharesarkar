import { imageSize } from "image-size";

export const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type AllowedMime = (typeof ALLOWED_MIMES)[number];

// Ads accept everything editorial does, with their own (larger) caps below.
export const ALLOWED_AD_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type AllowedAdMime = (typeof ALLOWED_AD_MIMES)[number];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;            // 5 MB — static editorial
// Animated GIFs balloon past the static cap quickly. 8 MB gives editors enough
// room for short animations without letting a 50 MB monster onto an article card.
export const MAX_EDITORIAL_GIF_BYTES = 8 * 1024 * 1024;   // 8 MB — editorial GIFs
// Ads tolerate larger creatives. Per slot dimensions are still enforced upstream.
export const MAX_AD_FILE_BYTES = 10 * 1024 * 1024;        // 10 MB — ad creatives
export const MIN_DIMENSION = 200;                         // px (either side)
export const MAX_DIMENSION = 6000;                        // px (either side) — static
// Animated GIFs are far more expensive to render per pixel than static images,
// so we cap them tighter. 1920 covers every editorial hero slot we render at.
export const MAX_GIF_DIMENSION = 1920;                    // px (either side) — GIFs

const EXT_BY_MIME: Record<AllowedAdMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Check the file's actual magic bytes — `Content-Type` is client-supplied
 * and trivially spoofed, so we don't trust it.
 *
 *   JPEG  → FF D8 FF
 *   PNG   → 89 50 4E 47  0D 0A 1A 0A
 *   WEBP  → "RIFF" .... "WEBP"
 *   GIF   → "GIF87a" or "GIF89a"
 */
export function detectMimeFromBytes(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // RIFF????WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (isGifBytes(buf)) {
    return "image/gif";
  }
  return null;
}

// GIF87a or GIF89a — both start with "GIF8?a".
function isGifBytes(buf: Buffer): boolean {
  if (buf.length < 6) return false;
  return (
    buf[0] === 0x47 && // G
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x38 && // 8
    (buf[4] === 0x37 || buf[4] === 0x39) && // 7 or 9
    buf[5] === 0x61    // a
  );
}

// Kept as an alias for callers that explicitly want the ad-mime type label.
// The byte detection logic is now unified in `detectMimeFromBytes`.
export function detectAdMimeFromBytes(buf: Buffer): AllowedAdMime | null {
  return detectMimeFromBytes(buf);
}

export function extensionFor(mime: AllowedAdMime): string {
  return EXT_BY_MIME[mime];
}

export interface ValidatedImage {
  mime: AllowedMime;
  ext: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Run the full upload validation pipeline. Throws an Error whose message is
 * safe to surface directly to the admin UI.
 *
 * GIFs have their own, tighter caps — they're allowed editorially for short
 * animations but get a smaller dimension ceiling (1920 px) and a slightly
 * higher size cap (8 MB) than static images, because animation frames inflate
 * file size while rendering cost grows quadratically with pixel count.
 */
export function validateImageBuffer(buf: Buffer): ValidatedImage {
  if (!buf || buf.length === 0) {
    throw new Error("File is empty.");
  }

  const mime = detectMimeFromBytes(buf);
  if (!mime) {
    throw new Error(
      "Unsupported image format. Allowed: JPEG, PNG, WebP, GIF."
    );
  }

  const isGif = mime === "image/gif";
  const sizeCap = isGif ? MAX_EDITORIAL_GIF_BYTES : MAX_FILE_BYTES;
  if (buf.length > sizeCap) {
    const mb = (buf.length / (1024 * 1024)).toFixed(2);
    const capMb = (sizeCap / (1024 * 1024)).toFixed(0);
    throw new Error(
      isGif
        ? `GIF is ${mb} MB — the limit is ${capMb} MB. Try compressing the animation or reducing frame count.`
        : `File is ${mb} MB — the limit is ${capMb} MB.`
    );
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(buf);
  } catch {
    throw new Error("Could not read image dimensions — file may be corrupt.");
  }
  const { width, height } = dimensions;
  if (!width || !height) {
    throw new Error("Could not determine image dimensions.");
  }
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new Error(
      `Image is too small (${width}×${height} px). Minimum ${MIN_DIMENSION}×${MIN_DIMENSION} px for editorial use.`
    );
  }
  const dimCap = isGif ? MAX_GIF_DIMENSION : MAX_DIMENSION;
  if (width > dimCap || height > dimCap) {
    throw new Error(
      isGif
        ? `GIF is too large (${width}×${height} px). Please resize below ${dimCap}×${dimCap} px before uploading — animated images at higher resolutions degrade page performance.`
        : `Image is too large (${width}×${height} px). Please resize below ${dimCap}×${dimCap} px before uploading.`
    );
  }

  return {
    mime,
    ext: extensionFor(mime),
    width,
    height,
    size: buf.length,
  };
}

export interface ValidatedAdImage {
  mime: AllowedAdMime;
  ext: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Validation pipeline for ad creatives. Mirrors `validateImageBuffer` but
 * additionally accepts animated GIFs and uses the larger ad size cap.
 */
export function validateAdImageBuffer(buf: Buffer): ValidatedAdImage {
  if (!buf || buf.length === 0) {
    throw new Error("File is empty.");
  }
  if (buf.length > MAX_AD_FILE_BYTES) {
    const mb = (buf.length / (1024 * 1024)).toFixed(2);
    throw new Error(
      `File is ${mb} MB — the limit is ${(MAX_AD_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  const mime = detectAdMimeFromBytes(buf);
  if (!mime) {
    throw new Error(
      "Unsupported image format. Allowed: JPEG, PNG, WebP, GIF."
    );
  }

  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(buf);
  } catch {
    throw new Error("Could not read image dimensions — file may be corrupt.");
  }
  const { width, height } = dimensions;
  if (!width || !height) {
    throw new Error("Could not determine image dimensions.");
  }
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new Error(
      `Image is too small (${width}×${height} px). Minimum ${MIN_DIMENSION}×${MIN_DIMENSION} px.`
    );
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `Image is too large (${width}×${height} px). Please resize below ${MAX_DIMENSION}×${MAX_DIMENSION} px before uploading.`
    );
  }

  return {
    mime,
    ext: extensionFor(mime),
    width,
    height,
    size: buf.length,
  };
}

/**
 * Measure an image's pixel dimensions without applying the ad-mime /
 * size caps used by `validateAdImageBuffer`. Used by the ads route to
 * verify that an externally-hosted creative (or one picked from the
 * media library after the upload-time check has passed) actually
 * matches the size the admin declared.
 *
 * Throws an Error with an admin-facing message if the buffer can't
 * be parsed as an image.
 */
export function measureImageBuffer(buf: Buffer): { width: number; height: number } {
  if (!buf || buf.length === 0) {
    throw new Error("Image is empty.");
  }
  let dimensions: { width?: number; height?: number };
  try {
    dimensions = imageSize(buf);
  } catch {
    throw new Error("Could not read image dimensions — file may be corrupt or not an image.");
  }
  const { width, height } = dimensions;
  if (!width || !height) {
    throw new Error("Could not determine image dimensions.");
  }
  return { width, height };
}
