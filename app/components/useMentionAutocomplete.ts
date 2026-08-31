"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MentionFriend } from "@/lib/types";

export type MentionContext = { start: number; query: string } | null;

const MENTION_WORD_CHAR = /[a-zA-Z0-9_]/;
const MAX_MENTION_RESULTS = 8;

// Finds an active "@query" being typed, given the current value and caret
// position. The "@" must start a word (start of text or preceded by
// whitespace) so emails like user@example.com don't open the picker.
export function findMentionContext(
    value: string,
    caret: number,
): MentionContext {
    let i = caret - 1;
    while (i >= 0 && MENTION_WORD_CHAR.test(value[i])) i--;
    if (i < 0 || value[i] !== "@") return null;
    if (i > 0 && !/\s/.test(value[i - 1])) return null;
    return { start: i, query: value.slice(i + 1, caret) };
}

export function useMentionAutocomplete({
    friends,
    value,
    setValue,
}: {
    friends?: MentionFriend[];
    value: string;
    setValue: (next: string) => void;
}) {
    const hasMentions = !!friends && friends.length > 0;
    const rootRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingCaretRef = useRef<number | null>(null);
    const [mention, setMention] = useState<MentionContext>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const results = useMemo(() => {
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

    const visibleResults = results.slice(0, MAX_MENTION_RESULTS);
    const truncated = results.length > MAX_MENTION_RESULTS;

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
    }, [value]);

    // Close the picker when the user clicks/taps outside the composer.
    useEffect(() => {
        if (!mention) return;
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (
                rootRef.current &&
                !rootRef.current.contains(event.target as Node)
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

    const syncMention = (el: HTMLTextAreaElement) => {
        if (!hasMentions) {
            setMention(null);
            return;
        }
        setMention(
            findMentionContext(el.value, el.selectionStart ?? el.value.length),
        );
        setActiveIndex(0);
    };

    const insertMention = (friend: MentionFriend) => {
        if (!mention) return;
        const { start, query } = mention;
        const before = value.slice(0, start);
        const after = value.slice(start + 1 + query.length);
        const insertion = `@${friend.username} `;
        setValue(before + insertion + after);
        setMention(null);
        setActiveIndex(0);
        pendingCaretRef.current = before.length + insertion.length;
        textareaRef.current?.focus();
    };

    // Returns true when the key was consumed by the mention picker, so callers
    // can fall through to their own key handling (e.g. Enter to submit).
    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLTextAreaElement>,
    ): boolean => {
        if (mention && visibleResults.length > 0) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex(
                    (index) => (index + 1) % visibleResults.length,
                );
                return true;
            }
            if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex(
                    (index) =>
                        (index - 1 + visibleResults.length) %
                        visibleResults.length,
                );
                return true;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                insertMention(visibleResults[activeIndex]);
                return true;
            }
        }
        if (event.key === "Escape" && mention) {
            event.preventDefault();
            setMention(null);
            setActiveIndex(0);
            return true;
        }
        return false;
    };

    const closeMention = () => {
        setMention(null);
        setActiveIndex(0);
    };

    return {
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
    };
}
