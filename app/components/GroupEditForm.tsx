"use client";

import { useState } from "react";
import { updateGroupCommentAction, updateGroupPostAction } from "@/app/actions";

export default function GroupEditForm({ groupId, postId, commentId, initialBody, onCancel, onSaved }: { groupId: string; postId?: string; commentId?: string; initialBody: string; onCancel: () => void; onSaved: (body: string) => void }) {
  const [body, setBody] = useState(initialBody);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setPending(true); setError("");
    const formData = new FormData(); formData.set("body", body);
    const result = postId ? await updateGroupPostAction(groupId, postId, formData) : await updateGroupCommentAction(groupId, commentId!, formData);
    setPending(false);
    if (result.error) setError(result.error); else onSaved(body);
  };
  return <div className="mt-1 flex flex-wrap gap-1"><input value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void save(); } }} className="input flex-1 min-w-[150px] text-[11px]" disabled={pending} autoFocus /><button type="button" className="btn text-[11px]" onClick={save} disabled={pending || !body.trim()}>Save</button><button type="button" className="btn btn-ghost text-[11px]" onClick={onCancel} disabled={pending}>Cancel</button>{error && <span className="w-full text-[11px] text-red-600">{error}</span>}</div>;
}
