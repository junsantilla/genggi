"use client";

import { useState } from "react";
import {
  updateBulletinCommentAction,
  updateBulletinPostAction,
} from "@/app/actions";
import type {
  BulletinMentionRef,
  BulletinVisibility,
  MentionFriend,
} from "@/lib/types";
import { useMentionAutocomplete } from "./useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";

export default function BulletinEditForm({
  mode,
  itemId,
  initialBody,
  initialVisibility,
  onCancel,
  onSaved,
  friends,
}: {
  mode: "post" | "comment";
  itemId: string;
  initialBody: string;
  initialVisibility?: BulletinVisibility;
  onCancel: () => void;
  onSaved: (
    body: string,
    visibility?: BulletinVisibility,
    mentions?: BulletinMentionRef[],
  ) => void;
  friends?: MentionFriend[];
}) {
  const [body, setBody] = useState(initialBody);
  const [visibility, setVisibility] = useState<BulletinVisibility>(
    initialVisibility ?? "public",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const maxLength = mode === "post" ? 1000 : 500;
  const remaining = maxLength - body.length;

  const {
    rootRef,
    textareaRef,
    mention,
    activeIndex,
    setActiveIndex,
    visibleResults,
    truncated,
    hasMentions,
    handleKeyDown,
    syncMention,
    insertMention,
    closeMention,
  } = useMentionAutocomplete({ friends, value: body, setValue: setBody });

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
            mentions?: BulletinMentionRef[];
          } =
            mode === "post"
              ? await updateBulletinPostAction(itemId, { error: "" }, formData)
              : await updateBulletinCommentAction(itemId, { error: "" }, formData);

          if (result.error) {
            setError(result.error);
            return;
          }

          closeMention();
          onSaved(
            result.body ?? body,
            result.visibility ?? visibility,
            result.mentions,
          );
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
      <div className="relative" ref={rootRef}>
        <textarea
          id={`edit-${mode}-${itemId}`}
          name="body"
          value={body}
          ref={textareaRef}
          onChange={(event) => {
            setBody(event.target.value);
            setError("");
            syncMention(event.target);
          }}
          onSelect={(event) => syncMention(event.currentTarget)}
          onClick={(event) => syncMention(event.currentTarget)}
          onKeyDown={(event) => {
            if (handleKeyDown(event)) return;
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
          role={hasMentions ? "combobox" : undefined}
          aria-expanded={mention ? "true" : "false"}
          aria-controls={mention ? "mention-suggestions" : undefined}
          aria-activedescendant={
            mention && visibleResults.length > 0
              ? `mention-option-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
        />
        {hasMentions && mention && (
          <MentionSuggestions
            mention={mention}
            results={visibleResults}
            truncated={truncated}
            activeIndex={activeIndex}
            onSelect={insertMention}
            onHover={setActiveIndex}
          />
        )}
      </div>
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
