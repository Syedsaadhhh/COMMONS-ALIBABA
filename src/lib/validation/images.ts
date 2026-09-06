/**
 * COMMONS — Client-side image validation and compression.
 *
 * Accepts JPEG, PNG, or WebP uploads from mobile cameras or file pickers,
 * validates magic bytes, enforces per-file and total payload limits, and
 * resamples through a canvas so every upload sent to the plan endpoint or
 * storage is small, safe, and EXIF-stripped.
 *
 * The output is a data URL (data:<mime>;base64,<bytes>) plus a SHA-256
 * fingerprint of the raw bytes, which the server re-hashes on receipt.
 */

export const MAX_IMAGES = 3;
export const MAX_SOURCE_FILE_BYTES = 5_242_880; // 5 MiB selected from a device
export const MAX_FILE_BYTES = 1_048_576; // 1 MiB after compression for the Qwen request
export const MAX_EVIDENCE_FILE_BYTES = 5_242_880; // 5 MiB stored directly as evidence
export const MAX_TOTAL_PAYLOAD_BYTES = 2_800_000; // ~2.8 MiB across all images
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

const MAX_LONG_EDGE_PX = 1280;
const DEFAULT_QUALITY = 0.8;
const FALLBACK_MIME = "image/jpeg";

const MAGIC_BYTES: Array<{ bytes: number[]; offset?: number; mime: string }> = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: "image/webp" },
];

function matchesMagic(view: Uint8Array, signature: number[], offset = 0): boolean {
  if (view.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (view[offset + i] !== signature[i]) return false;
  }
  return true;
}

function detectMime(bytes: Uint8Array, declaredType: string): AcceptedMimeType | null {
  for (const signature of MAGIC_BYTES) {
    if (matchesMagic(bytes, signature.bytes, signature.offset ?? 0)) {
      return signature.mime as AcceptedMimeType;
    }
  }
  if (ACCEPTED_MIME_TYPES.includes(declaredType as AcceptedMimeType)) {
    return declaredType as AcceptedMimeType;
  }
  return null;
}

function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsArrayBuffer(file);
  });
}

function bufferToDataURL(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export interface ValidatedImage {
  dataUrl: string;
  mimeType: AcceptedMimeType;
  byteSize: number;
  sha256: string;
}

export interface ImageValidationError {
  message: string;
}

/**
 * Validate a single user-selected file without compressing it.
 * Used to reject obviously bad files before kicking off the canvas pass.
 */
export async function validateImageFile(
  file: File,
  runningTotalBytes = 0,
): Promise<ValidatedImage | ImageValidationError> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as typeof ACCEPTED_MIME_TYPES[number])) {
    return { message: "Only JPEG, PNG, or WebP images are accepted." };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      message: `Image is too large (max ${Math.round(MAX_FILE_BYTES / 1024)} KB).`,
    };
  }

  const buffer = await fileToBuffer(file);
  const bytes = new Uint8Array(buffer);
  const mime = detectMime(bytes, file.type);

  if (!mime) {
    return { message: "The file does not look like a valid image." };
  }

  const dataUrl = bufferToDataURL(buffer, mime);
  const projectedTotal = runningTotalBytes + dataUrl.length;

  if (projectedTotal > MAX_TOTAL_PAYLOAD_BYTES) {
    return {
      message: "The total image payload is too large. Remove an image or use smaller photos.",
    };
  }

  const sha256 = await sha256Hex(buffer);

  return {
    dataUrl,
    mimeType: mime,
    byteSize: buffer.byteLength,
    sha256,
  };
}

/**
 * Downscale and re-compress an image through a canvas. EXIF orientation is
 * discarded — only the visual pixels are kept. Returns the original file
 * unchanged if canvas compression is unavailable (SSR, old browser).
 */
export async function compressImageForUpload(
  file: File,
  options: { maxLongEdge?: number; quality?: number } = {},
): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return file;
  }

  const maxLongEdge = options.maxLongEdge ?? MAX_LONG_EDGE_PX;
  const quality = options.quality ?? DEFAULT_QUALITY;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxLongEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }

  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();

  const mime =
    file.type === "image/webp" || file.type === "image/png"
      ? file.type
      : FALLBACK_MIME;

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob(
      (result) => resolve(result),
      mime,
      quality,
    );
  });

  if (!blob || blob.size === 0) {
    return file;
  }

  const filename = file.name || `upload.${mime.split("/")[1]}`;
  return new File([blob], filename, { type: blob.type || mime });
}
