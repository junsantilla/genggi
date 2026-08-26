import type { ImgHTMLAttributes } from "react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";

export default function UserAvatar({
  src,
  alt,
  cloudinaryWidth = 160,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string | null;
  alt: string;
  cloudinaryWidth?: number;
}) {
  const optimizedSrc = optimizeCloudinaryUrl(src, {
    width: cloudinaryWidth,
    height: cloudinaryWidth,
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizedSrc || "/images/avatar.png"}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
