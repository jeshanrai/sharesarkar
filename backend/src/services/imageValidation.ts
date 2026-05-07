import { imageSize } from "image-size";

export const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIMES)[number];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;        // 5 MB
export const MIN_DIMENSION = 200;                      // px (either side)
export const MAX_DIMENSION = 6000;                     // px (either side)

const EXT_BY_MIME: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Check the file's actual magic bytes — `Content-Type` is client-supplied
 * and trivially spoofed, so we don't trust it.
 *
 *   JPEG  → FF D8 FF
 *   PNG   → 89 50 4E 47  0D 0A 1A 0A
 *   WEBP  → "RIFF" .... "WEBP"
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
  return null;
}

export function extensionFor(mime: AllowedMime): string {
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
 */
export function validateImageBuffer(buf: Buffer): ValidatedImage {
  if (!buf || buf.length === 0) {
    throw new Error("File is empty.");
  }
  if (buf.length > MAX_FILE_BYTES) {
    const mb = (buf.length / (1024 * 1024)).toFixed(2);
    throw new Error(
      `File is ${mb} MB — the limit is ${(MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB.`
    );
  }

  const mime = detectMimeFromBytes(buf);
  if (!mime) {
    throw new Error(
      "Unsupported image format. Allowed: JPEG, PNG, WebP."
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
