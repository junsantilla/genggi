import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGroupById, getGroupMembership, getGroupPost } from "@/lib/group";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";
import BulletinBox from "@/app/components/BulletinBox";
import GroupPostCard from "@/app/components/GroupPostCard";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; postId: string }>;
}): Promise<Metadata> {
    const { id, postId } = await params;
    const user = await requireUser();
    const group = await getGroupById(id);
    if (!group) {
        return {
            title: "Post not found",
            description: "This group post could not be found.",
        };
    }

    const membership = await getGroupMembership(group._id, user._id);
    const isOwner = group.ownerId.toString() === user._id.toString();
    const canView =
        group.privacy === "public" ||
        isOwner ||
        membership?.status === "approved";
    const post = canView ? await getGroupPost(postId, group._id) : null;
    if (!post) {
        return {
            title: "Post not found",
            description: "This group post could not be found.",
        };
    }

    const description = post.body.replace(/\s+/g, " ").trim().slice(0, 160);

    return {
        title: `${post.author.displayName} in ${group.name}`,
        description,
        openGraph: {
            title: `${post.author.displayName} in ${group.name}`,
            description,
            type: "article",
            ...(post.photo
                ? {
                      images: [
                          {
                              url:
                                  optimizeCloudinaryUrl(post.photo, {
                                      width: 720,
                                  }) ?? post.photo,
                          },
                      ],
                  }
                : {}),
        },
    };
}

export default async function GroupPostPage({
    params,
}: {
    params: Promise<{ id: string; postId: string }>;
}) {
    const user = await requireUser();
    const { id, postId } = await params;
    const group = await getGroupById(id);
    if (!group) notFound();

    const membership = await getGroupMembership(group._id, user._id);
    const isOwner = group.ownerId.toString() === user._id.toString();
    const canView =
        group.privacy === "public" ||
        isOwner ||
        membership?.status === "approved";
    if (!canView) notFound();

    const post = await getGroupPost(postId, group._id);
    if (!post) notFound();

    const canInteract = membership?.status === "approved";

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div>
                <BulletinBox
                    title=" Group Post"
                    className="bulletin-board border border-none"
                >
                    <div className="bulletin group">
                        <GroupPostCard
                            post={post}
                            groupId={id}
                            currentUserId={user._id.toString()}
                            currentUsername={user.username}
                            canInteract={canInteract}
                            showComments
                        />
                    </div>
                </BulletinBox>
                <div className="text-center">
                    <Link href={`/groups/${id}`} className="text-[#003399] ">
                        ← Back to {group.name}
                    </Link>
                </div>
            </div>
        </div>
    );
}
