"use client";

import PostCard from "./PostCard";
import type { GroupPostCard as GroupPost } from "@/lib/types";

export default function GroupPostCard({
    post,
    groupId,
    currentUserId,
    currentUsername,
    canInteract = false,
    showComments = false,
    isOwner = false,
}: {
    post: GroupPost;
    groupId: string;
    currentUserId?: string;
    currentUsername?: string;
    canInteract?: boolean;
    showComments?: boolean;
    isOwner?: boolean;
}) {
    return (
        <PostCard
            groupId={groupId}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            canInteract={canInteract}
            hideComments={!canInteract}
            showComments={showComments}
            isGroupOwner={isOwner}
            post={{ ...post, visibility: "public" }}
        />
    );
}
