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
            <div className="profile-vids-grid">
                {vids.map((vid) => (
                    <Link
                        key={vid._id}
                        href={`/vids/${vid._id}`}
                        className="profile-vid-card"
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
                                className="profile-vid-thumb"
                                loading="lazy"
                                decoding="async"
                            />
                        ) : (
                            <span
                                className="profile-vid-fallback"
                                aria-hidden="true"
                            >
                                📹
                            </span>
                        )}
                        <span className="profile-vid-overlay">
                            <Play
                                size={22}
                                className="profile-vid-play"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="profile-vid-views">
                            {formatCount(vid.viewCount)} views
                        </span>
                    </Link>
                ))}
            </div>
            <div className="profile-vids-footer">
                <Link href="/vids" className="profile-vids-browse">
                    Browse all Vids »
                </Link>
            </div>
        </Box>
    );
}
