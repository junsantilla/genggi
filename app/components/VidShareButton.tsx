"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { shareVidAction } from "@/app/actions";

// Uses the Web Share API where supported and falls back to copying the vid's
// shareable URL (/vids/{id}). Share counting happens server-side only after a
// real share completes, and only when logged in.
export default function VidShareButton({
    vidId,
    title,
    isLoggedIn,
    className = "",
}: {
    vidId: string;
    title: string;
    isLoggedIn: boolean;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    const url = `/vids/${vidId}`;

    const countShare = () => {
        if (isLoggedIn) {
            shareVidAction(vidId).catch(() => {});
        }
    };

    const handleShare = async () => {
        const fullUrl = `${window.location.origin}${url}`;
        if (typeof navigator.share === "function") {
            try {
                await navigator.share({ title, url: fullUrl });
                countShare();
                return;
            } catch {
                // User cancelled the share sheet — do nothing.
                return;
            }
        }
        // Fallback: copy the link.
        try {
            await navigator.clipboard.writeText(fullUrl);
        } catch {
            // Old browsers without clipboard API: select the URL from a prompt.
            window.prompt("Copy this link", fullUrl);
        }
        setCopied(true);
        countShare();
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            onClick={handleShare}
            className={`inline-flex cursor-pointer items-center justify-center border border-[#6699cc] bg-[#dbe9f7] p-1.5 text-[#003399] hover:bg-[#cddcee] ${className}`}
            aria-label={copied ? "Link copied" : "Share this Vid"}
            title={copied ? "Link copied" : "Share this Vid"}
        >
            {copied ? (
                <Check size={16} aria-hidden="true" />
            ) : (
                <Share2 size={16} aria-hidden="true" />
            )}
        </button>
    );
}