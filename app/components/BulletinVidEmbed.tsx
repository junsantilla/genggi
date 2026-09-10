"use client";

import Link from "next/link";

// Inline video rendering for a bulletin post that mirrors a Vid. Looks like a
// normal post attachment: tappable thumbnail/poster that opens the full Vid,
// with native controls for inline playback.
export default function BulletinVidEmbed({
    vidId,
    videoUrl,
    thumbnailUrl,
}: {
    vidId: string;
    videoUrl: string;
    thumbnailUrl?: string | null;
}) {
    return (
        <div className="mt-1.5 overflow-hidden border border-[#99bbdd] bg-black">
            <video
                src={videoUrl}
                poster={thumbnailUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                className="block max-h-[480px] w-full bg-black"
                aria-label="Attached video"
            />
            {/* <Link
                href={`/vids?v=${vidId}`}
                className="block bg-[#dbe9f7] px-2 py-1 text-[11px] font-bold text-[#003399] no-underline hover:underline"
            >
                ▶ Watch on Vids
            </Link> */}
        </div>
    );
}
