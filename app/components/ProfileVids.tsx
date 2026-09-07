import Link from "next/link";
import { Play } from "lucide-react";
import type { SerializedVid } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import Box from "./Box";

// Server component: shows a user's recent published Vids on their profile as
// a thumbnail strip. Hidden entirely when the user has no Vids.
export default function ProfileVids({
    vids,
    border,
}: {
    vids: SerializedVid[];
    border: string;
}) {
    if (vids.length === 0) return null;

    return (
        <Box
            title={`Vids (${vids.length})`}
            border={border}
            bg="#f5f9ff"
            className="profile-vids"
        >
            <div className="grid grid-cols-3 gap-1.5">
                {vids.map((vid) => (
                    <Link
                        key={vid._id}
                        href={`/vids/${vid._id}`}
                        className="group relative block aspect-[9/16] overflow-hidden border border-[#6699cc] bg-black"
                        aria-label={
                            vid.caption
                                ? `Play Vid: ${vid.caption.slice(0, 80)}`
                                : "Play Vid"
                        }
                    >
                        {vid.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={vid.thumbnailUrl}
                                alt={vid.caption || "Vid thumbnail"}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <span
                                className="flex h-full items-center justify-center text-2xl text-white/80"
                                aria-hidden="true"
                            >
                                📹
                            </span>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                            <Play
                                size={22}
                                className="text-white drop-shadow"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">
                            {formatCount(vid.viewCount)} views
                        </span>
                    </Link>
                ))}
            </div>
            <div className="mt-1.5 text-[12px]">
                <Link href="/vids" className="text-[#003399] no-underline hover:underline">
                    Browse all Vids »
                </Link>
            </div>
        </Box>
    );
}