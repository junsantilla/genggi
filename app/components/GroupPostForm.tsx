"use client";

import PostComposer from "./PostComposer";
import { createGroupPostAction } from "@/app/actions";

export default function GroupPostForm({ groupId }: { groupId: string }) {
  return <PostComposer action={(formData) => createGroupPostAction(groupId, formData)} placeholder="Share with the group..." />;
}
