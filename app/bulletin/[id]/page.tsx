import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBulletinPostById } from "@/lib/bulletin";
import BulletinBoard from "@/app/components/BulletinBoard";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const user = await requireUser();
    const post = await getBulletinPostById(id, user._id.toString());

    if (!post) {
        return {
            title: "Post not found",
            description: "This bulletin post could not be found.",
        };
    }

    const description = post.body.replace(/\s+/g, " ").trim().slice(0, 160);

    return {
        title: `${post.author.displayName}'s bulletin`,
        description,
        openGraph: {
            title: `${post.author.displayName}'s bulletin`,
            description,
            type: "article",
            ...(post.photo ? { images: [{ url: post.photo }] } : {}),
        },
    };
}

export default async function BulletinPostPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireUser();
    const { id } = await params;
    const post = await getBulletinPostById(id, user._id.toString());
    if (!post) notFound();

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div className="bg-white border border-[#6699cc] sm:border-x p-2.5">
                <BulletinBoard
                    posts={[post]}
                    currentUserId={user._id.toString()}
                    currentUsername={user.username}
                    title=" Bulletin Post"
                />
                <div className="text-center">
                    <Link href="/" className="text-[#003399] text-[12px]">
                        ← Back to Bulletin Board
                    </Link>
                </div>
            </div>
        </div>
    );
}
