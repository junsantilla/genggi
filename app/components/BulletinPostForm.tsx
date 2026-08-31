"use client";

import PostComposer from "./PostComposer";
import { createBulletinPostAction } from "@/app/actions";
import type { MentionFriend } from "@/lib/types";

export default function BulletinPostForm({
  onPosted,
  friends,
}: {
  onPosted?: () => void;
  friends?: MentionFriend[];
}) {
  return (
    <PostComposer
      action={createBulletinPostAction}
      onPosted={onPosted}
      showPrivacy
      friends={friends}
    />
  );
}
