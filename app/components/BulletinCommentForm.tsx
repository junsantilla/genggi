"use client";

import { useRef, useState } from "react";
import { createBulletinCommentAction } from "@/app/actions";
import type { SerializedBulletinComment } from "@/lib/types";

export default function BulletinCommentForm({
    postId,
    onPosted,
}: {
    postId: string;
    onPosted?: (comment: SerializedBulletinComment) => void;
}) {
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

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
                    if (formRef.current) formRef.current.reset();
                    if (res.comment) onPosted?.(res.comment);
                }
            }}
            className="flex flex-wrap items-center gap-1.5 mt-1.5"
        >
            <textarea
                name="body"
                rows={1}
                maxLength={500}
                required
                className="input flex-1 min-w-[180px]"
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                    }
                }}
                placeholder="Write a comment..."
                aria-label="Write a comment"
            />
            {/* <button type="submit" disabled={pending} className="btn">
        {pending ? "..." : "Comment"}
      </button> */}
            {error && (
                <div className="text-red-600 text-[11px] w-full">{error}</div>
            )}
        </form>
    );
}
