"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { BulletinMentionRef } from "@/lib/types";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
// Captures "@username" only when the "@" starts a word, so emails like
// user@example.com are left alone. The capture group is just the username.
const MENTION_PATTERN = /(?<!\S)@([a-z0-9_]{3,20})/gi;

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

export default function LinkedText({
  text,
  mentions,
}: {
  text: string;
  // Validated mentions from the server. Only usernames in this list are
  // rendered as profile links; other @username text stays plain.
  mentions?: BulletinMentionRef[];
}) {
  const mentionUsernames = useMemo(() => {
    const set = new Set<string>();
    for (const mention of mentions ?? []) {
      set.add(mention.username.toLowerCase());
    }
    return set;
  }, [mentions]);

  const parts = text.split(URL_PATTERN);
  const nodes: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    const link = cleanUrl(part);
    if (link) {
      nodes.push(
        <a
          key={`${part}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[#003399] underline break-all"
          onClick={(event) => event.stopPropagation()}
        >
          {link.label}
        </a>,
      );
      return;
    }

    // Split the plain text into mention candidates: [text, username, text, ...]
    const mentionParts = part.split(MENTION_PATTERN);
    mentionParts.forEach((piece, pieceIndex) => {
      if (pieceIndex % 2 === 1) {
        const display = `@${piece}`;
        if (mentionUsernames.has(piece.toLowerCase())) {
          nodes.push(
            <Link
              key={`${part}-${index}-${pieceIndex}`}
              href={`/${piece}`}
              className="text-[#003399] font-bold underline"
              onClick={(event) => event.stopPropagation()}
            >
              {display}
            </Link>,
          );
        } else {
          nodes.push(<span key={`${part}-${index}-${pieceIndex}`}>{display}</span>);
        }
      } else if (piece) {
        nodes.push(<span key={`${part}-${index}-${pieceIndex}`}>{piece}</span>);
      }
    });
  });

  return <>{nodes}</>;
}
