"use client";

import PostCard from "./PostCard";
import type { GroupPostCard as GroupPost } from "@/lib/types";

export default function GroupPostCard({ post, groupId, currentUserId, currentUsername, canInteract = false, showComments = false }: { post: GroupPost; groupId: string; currentUserId?: string; currentUsername?: string; canInteract?: boolean; showComments?: boolean }) {
  return <PostCard groupId={groupId} currentUserId={currentUserId} currentUsername={currentUsername} canInteract={canInteract} hideComments={!canInteract} showComments={showComments} post={{ ...post, visibility: "public" }} />;
}
