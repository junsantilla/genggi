"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getChatboxMessagesAction,
  sendChatboxMessageAction,
} from "@/app/actions";
import type { ChatboxMessageCard } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function Avatar({
  photo,
  name,
  size = "h-8 w-8 text-[11px]",
}: {
  photo: string | null;
  name: string;
  size?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={`${size} object-cover border border-[#6699cc] shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${size} bg-[#e8e0f0] border border-[#6699cc] flex items-center justify-center text-[#4a76b8] font-bold shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatboxRoom({
  chatboxId,
  chatboxName,
  viewerId,
  viewerName,
  viewerPhoto,
  initialMessages,
}: {
  chatboxId: string;
  chatboxName: string;
  viewerId: string;
  viewerName: string;
  viewerPhoto: string | null;
  initialMessages: ChatboxMessageCard[];
}) {
  const [messages, setMessages] = useState<ChatboxMessageCard[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Live polling for new messages.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await getChatboxMessagesAction(chatboxId);
        if (!cancelled) setMessages(res.messages);
      } catch {
        // ignore transient poll errors
      } finally {
        if (!cancelled) timer = setTimeout(poll, 4000);
      }
    };
    timer = setTimeout(poll, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chatboxId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const formData = new FormData();
    formData.set("body", body);
    try {
      const res = await sendChatboxMessageAction(chatboxId, { error: "" }, formData);
      if (res.ok && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setInput("");
        inputRef.current?.focus();
      } else if (res.error) {
        setError(res.error);
      }
    } catch {
      setError("Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message window */}
      <div
        ref={scrollRef}
        className="bg-[#f5f9ff] border border-[#6699cc] overflow-y-auto px-2 py-2 flex flex-col gap-2.5"
        style={{ maxHeight: "50vh", minHeight: "300px" }}
      >
        {messages.length === 0 ? (
          <p className="text-gray-500 italic text-[12px] text-center my-auto">
            No messages yet. Break the ice — say hello!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === viewerId;
            return (
              <div
                key={m._id}
                className={`flex gap-2 items-end ${mine ? "flex-row-reverse" : ""}`}
              >
                {mine ? (
                  <Avatar
                    photo={viewerPhoto}
                    name={viewerName}
                    size="h-7 w-7 text-[10px]"
                  />
                ) : (
                  <Link href={`/${m.author.username}`} title={`View ${m.author.displayName}'s profile`}>
                    <Avatar
                      photo={m.author.photo}
                      name={m.author.displayName}
                      size="h-7 w-7 text-[10px]"
                    />
                  </Link>
                )}
                <div
                  className={`max-w-[78%] px-2.5 py-1.5 border ${
                    mine
                      ? "bg-[#cc99cc]/25 border-[#cc99cc] text-right"
                      : "bg-white border-[#6699cc] text-left"
                  }`}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {mine ? (
                      <span className="font-bold text-[11px] text-[#8a2b9a]">
                        You
                      </span>
                    ) : (
                      <Link
                        href={`/${m.author.username}`}
                        className="font-bold text-[11px] text-[#003399] no-underline hover:underline"
                      >
                        {m.author.displayName}
                      </Link>
                    )}
                    <span className="text-gray-400 text-[10px]" title={timeAgo(m.createdAt)}>
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] mt-0.5 break-words">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="mt-2 flex gap-2 items-stretch"
        aria-label={`Send message to ${chatboxName}`}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="input flex-1 resize-none"
          required
        />
        <button type="submit" disabled={sending} className="btn">
          {sending ? "..." : "Send ➤"}
        </button>
      </form>
      {error && <div className="text-red-600 text-[11px] mt-1">{error}</div>}
    </div>
  );
}
