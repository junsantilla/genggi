import type { ImgHTMLAttributes } from "react";

export default function UserAvatar({
  src,
  alt,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src?: string | null;
  alt: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src || "/images/avatar.png"} alt={alt} {...props} />
  );
}
