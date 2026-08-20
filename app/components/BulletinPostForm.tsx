"use client";

import { useActionState } from "react";
import { createBulletinPostAction } from "@/app/actions";

export default function BulletinPostForm() {
  const [state, formAction, pending] = useActionState(createBulletinPostAction, { error: "" });

  return (
    <form action={formAction} className="border-b border-[#99bbdd] pb-2 mb-2">
      <textarea
        name="body"
        rows={3}
        maxLength={1000}
        required
        className="input"
        placeholder="What&apos;s on your mind?"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <label className="label mb-0" htmlFor="bulletin-visibility">Who can see this?</label>
        <select id="bulletin-visibility" name="visibility" defaultValue="public" className="input w-auto">
          <option value="public">Public</option>
          <option value="friends">Friends</option>
          <option value="private">Only me</option>
        </select>
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Posting..." : "Post Bulletin"}
        </button>
      </div>
      {state.error && <div className="text-red-600 text-[10px] mt-1">{state.error}</div>}
      {state.ok && (
        <div className="text-green-700 text-[10px] font-bold mt-1" role="status">
          Posted!
        </div>
      )}
    </form>
  );
}
