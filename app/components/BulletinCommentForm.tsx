"use client";

import { useActionState } from "react";
import { createBulletinCommentAction } from "@/app/actions";

export default function BulletinCommentForm({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState(
    createBulletinCommentAction.bind(null, postId),
    { error: "" }
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5 mt-1.5">
      <textarea
        name="body"
        rows={1}
        maxLength={500}
        required
        className="input flex-1 min-w-[180px]"
        placeholder="Write a comment..."
      />
      <button type="submit" disabled={pending} className="btn">
        {pending ? "..." : "Comment"}
      </button>
      {state.error && <div className="text-red-600 text-[10px] w-full">{state.error}</div>}
      {state.ok && (
        <div className="text-green-700 text-[10px] font-bold w-full" role="status">
          Posted!
        </div>
      )}
    </form>
  );
}
