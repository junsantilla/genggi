export type CloudinaryImageOptions = {
  width: number;
  height?: number;
  crop?: "limit" | "fill";
};

/**
 * Adds responsive format, quality, and size transformations to Cloudinary
 * image URLs while leaving local or non-Cloudinary URLs unchanged.
 */
export function optimizeCloudinaryUrl(
  source: string | null | undefined,
  options: CloudinaryImageOptions,
): string | undefined {
  if (!source) return undefined;
  if (!source.includes("res.cloudinary.com")) return source;

  const marker = "/image/upload/";
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return source;

  const path = source.slice(markerIndex + marker.length);
  if (path.startsWith("f_auto,q_auto:eco,")) return source;

  const width = Math.max(1, Math.round(options.width));
  const height = options.height
    ? Math.max(1, Math.round(options.height))
    : undefined;
  const crop = options.crop ?? (height ? "fill" : "limit");
  const dimensions = height
    ? `w_${width},h_${height},c_${crop},g_auto`
    : `w_${width},c_${crop}`;
  const transformation = `f_auto,q_auto:eco,${dimensions}`;
  const prefix = source.slice(0, markerIndex + marker.length);

  return `${prefix}${transformation}/${path}`;
}
