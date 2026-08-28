/**
 * Client-side image preparation for uploads.
 *
 * iPhone photos are shot in HEIC and Safari's photo-library picker transcodes
 * them to JPEG while roughly doubling their size, so camera photos routinely
 * exceed the 3MB server limit. Downscaled JPEGs also upload much faster on
 * mobile connections. HEIC/HEIF are re-encoded when the browser can decode
 * them; if it can't, the original file is returned and the server accepts it
 * (Cloudinary allows heic/heif and delivery uses f_auto).
 */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITIES = [0.85, 0.7, 0.55];

function isHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "") || "photo";
  return `${base}.jpg`;
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> decoding (e.g. HEIC on Safari 17+).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed."));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas encode failed."))),
      type,
      quality
    );
  });
}

/**
 * Returns a JPEG under MAX_UPLOAD_BYTES, or the original file unchanged when
 * no re-encode is needed or the browser cannot decode it.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  // GIFs are passed through untouched: re-encoding would lose animation.
  if (file.type === "image/gif") return file;
  if (file.size <= MAX_UPLOAD_BYTES && !isHeic(file)) return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeImage(file);
  } catch {
    return file;
  }

  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(source.width, source.height)
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // White backdrop so transparent PNGs don't turn black in JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ("close" in source) {
    (source as ImageBitmap).close();
  }

  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const compressed = new File([blob], toJpegName(file.name), {
      type: "image/jpeg",
    });
    if (compressed.size <= MAX_UPLOAD_BYTES || quality === JPEG_QUALITIES[JPEG_QUALITIES.length - 1]) {
      return compressed;
    }
  }
  return file;
}
