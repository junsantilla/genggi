"use client";

import PostCard from "./PostCard";
import type { GroupPostCard as GroupPost } from "@/lib/types";

export default function GroupPostCard({ post, groupId, currentUserId, currentUsername, canInteract = false }: { post: GroupPost; groupId: string; currentUserId?: string; currentUsername?: string; canInteract?: boolean }) {
  return <PostCard groupId={groupId} currentUserId={currentUserId} currentUsername={currentUsername} canInteract={canInteract} post={{ ...post, visibility: "public" }} />;
}
