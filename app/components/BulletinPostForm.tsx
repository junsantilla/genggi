"use client";

import PostComposer from "./PostComposer";
import { createBulletinPostAction } from "@/app/actions";

export default function BulletinPostForm({ onPosted }: { onPosted?: () => void }) {
  return <PostComposer action={createBulletinPostAction} onPosted={onPosted} showPrivacy />;
}
