"use client";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function cleanUrl(value: string): { href: string; label: string } | null {
  const label = value.replace(/[.,!?;:]+$/, "");
  const href = label.toLowerCase().startsWith("www.") ? `https://${label}` : label;
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const isYouTube = url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "youtu.be";
    const displayLabel = isYouTube && label.length > 55 ? `${label.slice(0, 55)}...` : label;
    return { href: url.toString(), label: displayLabel };
  } catch {
    return null;
  }
}

export default function LinkedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) => {
        const link = cleanUrl(part);
        if (!link) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <a
            key={`${part}-${index}`}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[#003399] underline break-all"
            onClick={(event) => event.stopPropagation()}
          >
            {link.label}
          </a>
        );
      })}
    </>
  );
}
