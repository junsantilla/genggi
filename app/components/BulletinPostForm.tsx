"use client";

import { useRef, useState } from "react";
import { createBulletinPostAction } from "@/app/actions";

export default function BulletinPostForm() {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [posted, setPosted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd: FormData) => {
        setPending(true);
        setError("");
        setPosted(false);
        const res = await createBulletinPostAction(fd);
        setPending(false);
        if (res && "error" in res && res.error) {
          setError(res.error);
        } else {
          setPosted(true);
          setFileName("");
          if (formRef.current) formRef.current.reset();
        }
      }}
      className="border-b border-[#99bbdd] pb-2 mb-2"
    >
      <textarea
        name="body"
        rows={3}
        maxLength={1000}
        required
        className="input"
        placeholder="What&apos;s on your mind?"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <label className="label mb-0" htmlFor="bulletin-photo">Add a photo (optional)</label>
        <label htmlFor="bulletin-photo" className="btn">
          {fileName ? fileName : "Choose File"}
        </label>
        <input
          id="bulletin-photo"
          type="file"
          name="photo"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFileName(f.name);
            } else {
              setFileName("");
            }
          }}
        />
      </div>
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
      {error && <div className="text-red-600 text-[11px] mt-1">{error}</div>}
      {posted && (
        <div className="text-green-700 text-[11px] font-bold mt-1" role="status">
          Posted!
        </div>
      )}
    </form>
  );
}
