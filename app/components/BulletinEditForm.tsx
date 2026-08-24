"use client";

import { useState } from "react";
import {
  updateBulletinCommentAction,
  updateBulletinPostAction,
} from "@/app/actions";
import type { BulletinVisibility } from "@/lib/types";

export default function BulletinEditForm({
  mode,
  itemId,
  initialBody,
  initialVisibility,
  onCancel,
  onSaved,
}: {
  mode: "post" | "comment";
  itemId: string;
  initialBody: string;
  initialVisibility?: BulletinVisibility;
  onCancel: () => void;
  onSaved: (body: string, visibility?: BulletinVisibility) => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [visibility, setVisibility] = useState<BulletinVisibility>(
    initialVisibility ?? "public",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const maxLength = mode === "post" ? 1000 : 500;
  const remaining = maxLength - body.length;

  return (
    <form
      action={async (formData: FormData) => {
        setPending(true);
        setError("");
        try {
          const result: {
            ok?: boolean;
            error?: string;
            body?: string;
            visibility?: BulletinVisibility;
          } =
            mode === "post"
              ? await updateBulletinPostAction(itemId, { error: "" }, formData)
              : await updateBulletinCommentAction(itemId, { error: "" }, formData);

          if (result.error) {
            setError(result.error);
            return;
          }

          onSaved(result.body ?? body, result.visibility ?? visibility);
        } catch {
          setError("Could not save your changes. Please try again.");
        } finally {
          setPending(false);
        }
      }}
      className={`mt-1.5 border border-[#99bbdd] bg-[#f5f9ff] p-2 ${
        mode === "post" ? "mb-1" : "w-full"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <label
          htmlFor={`edit-${mode}-${itemId}`}
          className="text-[11px] font-bold text-[#2c4d80]"
        >
          {mode === "post" ? "Edit your post" : "Edit your comment"}
        </label>
        <span
          className={`text-[10px] ${
            remaining < 100 ? "text-orange-600 font-bold" : "text-gray-400"
          }`}
        >
          {remaining} left
        </span>
      </div>
      <textarea
        id={`edit-${mode}-${itemId}`}
        name="body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError("");
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        maxLength={maxLength}
        rows={mode === "post" ? 4 : 2}
        disabled={pending}
        required
        autoFocus
        className="input w-full resize-y"
        aria-describedby={error ? `edit-error-${mode}-${itemId}` : undefined}
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        {mode === "post" ? (
          <label className="flex items-center gap-1 text-[11px] text-gray-600">
            <span>Who can see it?</span>
            <select
              name="visibility"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as BulletinVisibility)
              }
              disabled={pending}
              className="input w-auto py-1 text-[11px]"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Only me</option>
            </select>
          </label>
        ) : (
          <span className="text-[10px] text-gray-500">Changes are saved to your comment.</span>
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn btn-ghost text-[11px] px-2 py-0.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="btn text-[11px] px-2 py-0.5"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
      {error && (
        <div
          id={`edit-error-${mode}-${itemId}`}
          role="alert"
          className="mt-1.5 text-[11px] text-red-600"
        >
          {error}
        </div>
      )}
      <p className="mt-1 text-[10px] text-gray-400">Tip: press Ctrl/⌘ + Enter to save.</p>
    </form>
  );
}
