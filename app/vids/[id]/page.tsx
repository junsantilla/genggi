import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getVidById } from "@/lib/vids";
import { displayNameOrUsername } from "@/lib/utils";
import VidPlayer from "@/app/components/VidPlayer";
import VidCard from "@/app/components/VidCard";
import VidShareButton from "@/app/components/VidShareButton";

async function getSiteOrigin(): Promise<string> {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    const proto =
        h.get("x-forwarded-proto") ||
        (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const vid = await getVidById(id, null);
    const origin = await getSiteOrigin();

    if (!vid || vid.status !== "published") {
        return {
            title: "Vid not found",
            description: "This Vid could not be found.",
            robots: { index: false, follow: false },
        };
    }

    const authorName = displayNameOrUsername(
        vid.author.displayName,
        vid.author.username,
    );
    const caption = vid.caption.replace(/\s+/g, " ").trim();
    const title = caption
        ? `${authorName}'s Vid: ${caption.slice(0, 60)}`
        : `${authorName}'s Vid`;
    const description = (
        caption ||
        `Watch ${authorName}'s short video on Genggi.`
    ).slice(0, 160);
    const canonical = `${origin}/vids/${vid._id}`;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title: `${title} | genggi`,
            description,
            type: "video.other",
            url: canonical,
            images: vid.thumbnailUrl
                ? [
                      {
                          url: vid.thumbnailUrl,
                          alt: title,
                          ...(vid.width ? { width: vid.width } : {}),
                          ...(vid.height ? { height: vid.height } : {}),
                      },
                  ]
                : [],
            videos: [
                {
                    url: vid.videoUrl,
                    ...(vid.width ? { width: vid.width } : {}),
                    ...(vid.height ? { height: vid.height } : {}),
                },
            ],
        },
        twitter: {
            card: vid.thumbnailUrl ? "summary_large_image" : "summary",
            title,
            description,
            images: vid.thumbnailUrl ? [vid.thumbnailUrl] : [],
        },
        robots: vid.status === "published" ? undefined : { index: false },
    };
}

export default async function VidPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const user = await getCurrentUser();
    const vid = await getVidById(id, user?._id.toString() ?? null);
    if (!vid || vid.status !== "published") notFound();

    const authorName = displayNameOrUsername(
        vid.author.displayName,
        vid.author.username,
    );

    return (
        <div className="vids-page max-w-[960px] w-full mx-auto">
            <div className="p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                        href="/vids"
                        className="text-[#003399] font-bold no-underline hover:underline"
                    >
                        ← Back to Vids
                    </Link>
                    <VidShareButton
                        vidId={vid._id}
                        title={vid.caption || `${authorName}'s Vid`}
                        isLoggedIn={!!user}
                    />
                </div>

                <div className="relative mx-auto aspect-[9/16] max-h-[calc(100dvh-160px)] w-full max-w-[min(540px,calc((100dvh-160px)*0.5625))] overflow-hidden bg-black">
                    <VidPlayer vid={vid} active preload="auto" />
                    <VidCard
                        vid={vid}
                        isLoggedIn={!!user}
                        currentUserId={user?._id.toString()}
                    />
                </div>

                <div className="mx-auto mt-2 max-w-[540px] border border-[#99bbdd] bg-white p-3">
                    {vid.caption ? (
                        <p className="whitespace-pre-wrap text-[13px] text-black dark:text-[#e8e8e8]">
                            {vid.caption}
                        </p>
                    ) : (
                        <p className="text-gray-500 italic text-[12px]">
                            No caption.
                        </p>
                    )}
                    <div className="mt-2 border-t border-dotted border-[#99bbdd] pt-2 text-[12px]">
                        <Link
                            href={`/${vid.author.username}`}
                            className="text-[#003399] font-bold no-underline hover:underline"
                        >
                            View {authorName}&apos;s profile »
                        </Link>
                        <span className="text-gray-500">
                            {" "}
                            ·{" "}
                            <Link
                                href="/vids"
                                className="text-[#003399] no-underline hover:underline"
                            >
                                Watch more Vids
                            </Link>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}