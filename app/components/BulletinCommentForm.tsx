"use client";

import { useRef, useState } from "react";
import { createBulletinCommentAction } from "@/app/actions";
import type {
    MentionFriend,
    SerializedBulletinComment,
} from "@/lib/types";
import { useMentionAutocomplete } from "./useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";

export default function BulletinCommentForm({
    postId,
    onPosted,
    friends,
}: {
    postId: string;
    onPosted?: (comment: SerializedBulletinComment) => void;
    friends?: MentionFriend[];
}) {
    const [body, setBody] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

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
            ref={formRef}
            action={async (fd: FormData) => {
                setPending(true);
                setError("");
                const res = await createBulletinCommentAction(postId, fd);
                setPending(false);
                if (res && "error" in res && res.error) setError(res.error);
                else {
                    setBody("");
                    closeMention();
                    if (res.comment) onPosted?.(res.comment);
                }
            }}
            className="flex flex-wrap items-center gap-1.5 mt-1.5"
        >
            <div className="relative flex-1 min-w-[180px]" ref={rootRef}>
                <textarea
                    name="body"
                    rows={1}
                    maxLength={500}
                    required
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
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                        }
                    }}
                    disabled={pending}
                    className="input w-full bg-[#DBE9F7]"
                    placeholder="Write a comment..."
                    aria-label="Write a comment"
                    role={hasMentions ? "combobox" : undefined}
                    aria-expanded={mention ? "true" : "false"}
                    aria-controls={
                        mention ? "mention-suggestions" : undefined
                    }
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
            {error && (
                <div className="text-red-600 text-[11px] w-full">{error}</div>
            )}
        </form>
    );
}
