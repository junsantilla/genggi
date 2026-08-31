"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Lock, Users } from "lucide-react";
import {
    compressImageForUpload,
    MAX_UPLOAD_BYTES,
} from "@/lib/compress-image";
import { displayNameOrUsername } from "@/lib/utils";
import type { MentionFriend } from "@/lib/types";
import UserAvatar from "./UserAvatar";

type PostResult = { ok?: boolean; error?: string };

type MentionContext = { start: number; query: string } | null;

const MENTION_WORD_CHAR = /[a-zA-Z0-9_]/;
const MAX_MENTION_RESULTS = 8;

// Finds an active "@query" being typed, given the current value and caret
// position. The "@" must start a word (start of text or preceded by
// whitespace) so emails like user@example.com don't open the picker.
function findMentionContext(value: string, caret: number): MentionContext {
    let i = caret - 1;
    while (i >= 0 && MENTION_WORD_CHAR.test(value[i])) i--;
    if (i < 0 || value[i] !== "@") return null;
    if (i > 0 && !/\s/.test(value[i - 1])) return null;
    return { start: i, query: value.slice(i + 1, caret) };
}

export default function PostComposer({
    action,
    onPosted,
    placeholder = "What's on your mind?",
    showPrivacy = false,
    friends,
}: {
    action: (formData: FormData) => Promise<PostResult>;
    onPosted?: () => void;
    placeholder?: string;
    showPrivacy?: boolean;
    // When provided, typing "@" opens a friend-mention autocomplete.
    friends?: MentionFriend[];
}) {
    const [body, setBody] = useState("");
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [posted, setPosted] = useState(false);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const compressedRef = useRef<File | null>(null);
    const compressPromiseRef = useRef<Promise<void> | null>(null);
    const remaining = 1000 - body.length;
    const [visibility, setVisibility] = useState("public");
    // --- @mention autocomplete state ---
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const composerRootRef = useRef<HTMLDivElement>(null);
    const pendingCaretRef = useRef<number | null>(null);
    const [mention, setMention] = useState<MentionContext>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const privacyLabel =
        visibility === "private"
            ? "Only me"
            : visibility === "friends"
              ? "Friends"
              : "Public";
    const VisibilityIcon =
        visibility === "private"
            ? Lock
            : visibility === "friends"
              ? Users
              : Globe;

    const hasMentions = !!friends && friends.length > 0;

    const mentionResults = useMemo(() => {
        if (!hasMentions || !mention) return [];
        const q = mention.query.trim().toLowerCase();
        if (!q) return friends!;
        return friends!.filter(
            (friend) =>
                friend.username.toLowerCase().includes(q) ||
                friend.displayName.toLowerCase().includes(q) ||
                friend.firstName.toLowerCase().includes(q) ||
                friend.lastName.toLowerCase().includes(q),
        );
    }, [friends, mention, hasMentions]);

    const visibleMentionResults = mentionResults.slice(0, MAX_MENTION_RESULTS);
    const mentionTruncated = mentionResults.length > MAX_MENTION_RESULTS;

    const syncMention = (value: string, caret: number) => {
        if (!hasMentions) {
            setMention(null);
            return;
        }
        setMention(findMentionContext(value, caret));
        setActiveIndex(0);
    };

    const insertMention = (friend: MentionFriend) => {
        if (!mention) return;
        const { start, query } = mention;
        const before = body.slice(0, start);
        const after = body.slice(start + 1 + query.length);
        const insertion = `@${friend.username} `;
        const next = before + insertion + after;
        setBody(next);
        setMention(null);
        setActiveIndex(0);
        pendingCaretRef.current = before.length + insertion.length;
        textareaRef.current?.focus();
    };

    // Restore the caret after a mention is inserted (state is applied async).
    useEffect(() => {
        if (pendingCaretRef.current == null) return;
        const el = textareaRef.current;
        if (el) {
            el.setSelectionRange(
                pendingCaretRef.current,
                pendingCaretRef.current,
            );
            pendingCaretRef.current = null;
        }
    }, [body]);

    // Close the picker when the user clicks/taps outside the composer.
    useEffect(() => {
        if (!mention) return;
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (
                composerRootRef.current &&
                !composerRootRef.current.contains(event.target as Node)
            ) {
                setMention(null);
                setActiveIndex(0);
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [mention]);

    return (
        <form
            ref={formRef}
            action={async (formData) => {
                if (pending) return;
                setPending(true);
                setError("");
                setPosted(false);
                try {
                    if (compressPromiseRef.current)
                        await compressPromiseRef.current;
                    const file = compressedRef.current;
                    if (file) formData.set("photo", file);
                    const result = await action(formData);
                    if (result.error) {
                        setError(result.error);
                        return;
                    }
                    setBody("");
                    setFileName("");
                    setPosted(true);
                    setMention(null);
                    setActiveIndex(0);
                    formRef.current?.reset();
                    compressedRef.current = null;
                    compressPromiseRef.current = null;
                    onPosted?.();
                } catch {
                    setError(
                        "Something went wrong while posting. Please try again."
                    );
                } finally {
                    setPending(false);
                }
            }}
            className="border-b border-[#99bbdd] bg-[#DBE9F7] p-2.5 mb-3"
        >
            <div className="relative" ref={composerRootRef}>
                <textarea
                    name="body"
                    rows={2}
                    maxLength={1000}
                    value={body}
                    ref={textareaRef}
                    onChange={(event) => {
                        setBody(event.target.value);
                        setError("");
                        setPosted(false);
                        syncMention(
                            event.target.value,
                            event.target.selectionStart ??
                                event.target.value.length,
                        );
                    }}
                    onSelect={(event) =>
                        syncMention(
                            event.currentTarget.value,
                            event.currentTarget.selectionStart ??
                                event.currentTarget.value.length,
                        )
                    }
                    onClick={(event) =>
                        syncMention(
                            event.currentTarget.value,
                            event.currentTarget.selectionStart ??
                                event.currentTarget.value.length,
                        )
                    }
                    onKeyDown={(event) => {
                        if (mention && visibleMentionResults.length > 0) {
                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setActiveIndex(
                                    (index) =>
                                        (index + 1) %
                                        visibleMentionResults.length,
                                );
                                return;
                            }
                            if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setActiveIndex(
                                    (index) =>
                                        (index -
                                            1 +
                                            visibleMentionResults.length) %
                                        visibleMentionResults.length,
                                );
                                return;
                            }
                            if (event.key === "Enter") {
                                event.preventDefault();
                                insertMention(
                                    visibleMentionResults[activeIndex],
                                );
                                return;
                            }
                        }
                        if (event.key === "Escape" && mention) {
                            event.preventDefault();
                            setMention(null);
                            setActiveIndex(0);
                        }
                    }}
                    disabled={pending}
                    className="input w-full resize-none pr-16 bg-white"
                    placeholder={placeholder}
                    role="combobox"
                    aria-expanded={mention ? "true" : "false"}
                    aria-controls={
                        mention ? "mention-suggestions" : undefined
                    }
                    aria-activedescendant={
                        mention && visibleMentionResults.length > 0
                            ? `mention-option-${activeIndex}`
                            : undefined
                    }
                    aria-autocomplete="list"
                />
                <span
                    className={`absolute right-2 bottom-2 text-[10px] ${remaining < 100 ? "text-orange-600 font-bold" : "text-gray-400"}`}
                >
                    {remaining}
                </span>
                {hasMentions && mention && (
                    <div
                        id="mention-suggestions"
                        role="listbox"
                        aria-label="Mention a friend"
                        className="absolute left-0 right-0 top-full z-30 mt-1 border border-[#6699cc] bg-white shadow-md"
                    >
                        {visibleMentionResults.length === 0 ? (
                            <div className="px-2 py-1.5 text-[11px] text-gray-500 italic">
                                No friends match “{mention.query}”
                            </div>
                        ) : (
                            <ul className="max-h-[180px] overflow-y-auto py-0.5">
                                {visibleMentionResults.map((friend, index) => (
                                    <li key={friend._id}>
                                        <button
                                            type="button"
                                            id={`mention-option-${index}`}
                                            role="option"
                                            aria-selected={index === activeIndex}
                                            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left ${
                                                index === activeIndex
                                                    ? "bg-[#DBE9F7]"
                                                    : ""
                                            }`}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                insertMention(friend);
                                            }}
                                            onMouseEnter={() =>
                                                setActiveIndex(index)
                                            }
                                        >
                                            <UserAvatar
                                                src={friend.photo}
                                                alt={displayNameOrUsername(
                                                    friend.displayName,
                                                    friend.username,
                                                )}
                                                className="w-6 h-6 object-cover shrink-0"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-[12px] font-bold text-[#003399] leading-tight">
                                                    {displayNameOrUsername(
                                                        friend.displayName,
                                                        friend.username,
                                                    )}
                                                </span>
                                                <span className="block truncate text-[11px] text-gray-500 leading-tight">
                                                    @{friend.username}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {mentionTruncated && (
                            <div className="border-t border-dotted border-[#99bbdd] px-2 py-1 text-[10px] text-gray-500">
                                Keep typing to narrow results…
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <label
                        htmlFor="post-photo"
                        className="btn cursor-pointer max-h-[27px]"
                    >
                        {fileName ? "Change photo" : "Add photo"}
                    </label>
                    <input
                        id="post-photo"
                        type="file"
                        name="photo"
                        accept="image/*"
                        disabled={pending}
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(event) => {
                            setError("");
                            setPosted(false);
                            compressedRef.current = null;
                            compressPromiseRef.current = null;
                            const f = event.target.files?.[0];
                            if (!f) {
                                setFileName("");
                                return;
                            }
                            if (!f.type.startsWith("image/")) {
                                setFileName("");
                                if (fileInputRef.current)
                                    fileInputRef.current.value = "";
                                setError("Please upload an image file.");
                                return;
                            }
                            setFileName(f.name);
                            compressPromiseRef.current = compressImageForUpload(f)
                                .then((compressed) => {
                                    if (compressed.size > MAX_UPLOAD_BYTES) {
                                        compressedRef.current = null;
                                        setFileName("");
                                        if (fileInputRef.current)
                                            fileInputRef.current.value = "";
                                        setError("Image must be under 3MB.");
                                        return;
                                    }
                                    compressedRef.current = compressed;
                                })
                                .catch(() => {
                                    compressedRef.current = null;
                                });
                        }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {showPrivacy && (
                        <>
                            <input
                                type="hidden"
                                name="visibility"
                                value={visibility}
                            />
                            <div className="relative">
                                <button
                                    type="button"
                                    className="flex items-center text-[#003399] font-bold hover:underline p-0.5"
                                    onClick={() =>
                                        setPrivacyOpen((open) => !open)
                                    }
                                    aria-label={`Post privacy: ${privacyLabel}`}
                                    aria-expanded={privacyOpen}
                                    title={`Post privacy: ${privacyLabel}`}
                                >
                                    <VisibilityIcon
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                </button>
                                {privacyOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() =>
                                                setPrivacyOpen(false)
                                            }
                                            aria-hidden="true"
                                        />
                                        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] border border-[#6699cc] bg-[#dbe9f7] p-2 shadow-md">
                                            {[
                                                ["public", "Public"],
                                                ["friends", "Friends"],
                                                ["private", "Only me"],
                                            ].map(([value, label]) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className="block w-full text-left cursor-pointer text-[#003399] font-bold hover:underline py-0.5"
                                                    onClick={() => {
                                                        setVisibility(value);
                                                        setPrivacyOpen(false);
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                    <button
                        type="submit"
                        disabled={pending || (!body.trim() && !fileName)}
                        className="btn min-w-[105px]"
                    >
                        {pending ? "Posting..." : "Post"}
                    </button>
                </div>
            </div>
            {fileName && (
                <div className="mt-1.5 text-[10px] text-gray-600">
                    📎 <span className="truncate">{fileName}</span>
                </div>
            )}
            {error && (
                <div role="alert" className="mt-2 text-[11px] text-red-600">
                    {error}
                </div>
            )}
            {posted && (
                <div
                    role="status"
                    className="mt-2 text-[11px] font-bold text-green-700"
                >
                    Posted successfully.
                </div>
            )}
        </form>
    );
}
