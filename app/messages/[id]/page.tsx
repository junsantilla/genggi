import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { sendMessageAction, deleteMessageAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import BoundForm from "@/app/components/BoundForm";
import Box from "@/app/components/Box";
import UserAvatar from "@/app/components/UserAvatar";
// import ScrollToBottom from "@/app/components/ScrollToBottom";

// Groups messages under "Today" / "Yesterday" / a full date label,
// the way most chat apps do, so long threads are easier to scan.
function dayLabel(date: Date) {
    const now = new Date();
    const startOf = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
        (startOf(now) - startOf(date)) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

export default async function ThreadPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireUser();
    const { id } = await params;
    const db = getDb();
    const uid = user._id.toString();

    let other;
    try {
        other = await db.collection("users").findOne({ _id: new ObjectId(id) });
    } catch {
        notFound();
    }
    if (!other) notFound();

    const messages = await db
        .collection("messages")
        .find({
            $or: [
                { senderId: user._id, recipientId: other._id },
                { senderId: other._id, recipientId: user._id },
            ],
        })
        .sort({ createdAt: 1 })
        .toArray();

    const myPhoto = user.photo as string | undefined;

    // Mark incoming messages as read
    const unreadIds = messages
        .filter((m) => m.recipientId.toString() === uid && !m.read)
        .map((m) => m._id);
    if (unreadIds.length > 0) {
        await db
            .collection("messages")
            .updateMany({ _id: { $in: unreadIds } }, { $set: { read: true } });
    }

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-3 py-2 flex items-center gap-2 shrink-0">
                <Link
                    href="/messages"
                    className="text-white/80 hover:text-white text-lg leading-none px-1 -ml-1"
                    aria-label="Back to inbox"
                    title="Back to inbox"
                >
                    ←
                </Link>
                <UserAvatar
                    src={other.photo}
                    alt={other.displayName}
                    className="w-7 h-7 object-cover rounded-full border border-white/40"
                />
                <span className="font-bold text-lg tracking-tight truncate">
                    {other.displayName}
                </span>
            </div>

            {/* Message list — scrolls independently, header & reply box stay put */}
            <div className="flex-1 overflow-y-auto px-3 py-3 bg-[#eef3fa]">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                        <UserAvatar
                            src={other.photo}
                            alt={other.displayName}
                            className="w-14 h-14 object-cover rounded-full opacity-70"
                        />
                        <p className="italic">
                            No messages yet — say hi to {other.displayName}!
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {messages.map((m, i) => {
                            const mine = m.senderId.toString() === uid;
                            const created = new Date(m.createdAt);
                            const prev =
                                i > 0
                                    ? new Date(messages[i - 1].createdAt)
                                    : null;
                            const showDateDivider =
                                !prev || dayLabel(prev) !== dayLabel(created);
                            const isLastMine =
                                mine &&
                                (i === messages.length - 1 ||
                                    messages[i + 1].senderId.toString() !==
                                        uid);

                            return (
                                <div key={m._id.toString()}>
                                    {showDateDivider && (
                                        <div className="flex items-center gap-2 my-3">
                                            <div className="h-px bg-[#c3d4e8] flex-1" />
                                            <span className="text-[11px] text-gray-500 font-semibold px-1">
                                                {dayLabel(created)}
                                            </span>
                                            <div className="h-px bg-[#c3d4e8] flex-1" />
                                        </div>
                                    )}

                                    <div
                                        className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
                                    >
                                        <UserAvatar
                                            src={mine ? myPhoto : other.photo}
                                            alt={
                                                mine ? "You" : other.displayName
                                            }
                                            className="w-6 h-6 object-cover rounded-full shrink-0 mb-4"
                                        />

                                        <div
                                            className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${mine ? "items-end" : "items-start"}`}
                                        >
                                            <div
                                                className={`px-3 py-1.5 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm ${
                                                    mine
                                                        ? "bg-[#cc3399] text-white rounded-br-sm"
                                                        : "bg-white border border-[#c3d4e8] text-[#1a1a1a] rounded-bl-sm"
                                                }`}
                                            >
                                                {m.body}
                                            </div>
                                            <div
                                                className={`flex items-center gap-2 mt-0.5 px-1 text-[10px] text-gray-400 ${mine ? "flex-row-reverse" : ""}`}
                                            >
                                                <span
                                                    title={created.toLocaleString()}
                                                >
                                                    {timeAgo(m.createdAt)}
                                                </span>
                                                {mine && (
                                                    <ActionButton
                                                        action={deleteMessageAction.bind(
                                                            null,
                                                            m._id.toString(),
                                                        )}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 underline-offset-2 hover:underline"
                                                        confirmText="Delete this message?"
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isLastMine && <div className="h-0.5" />}
                                </div>
                            );
                        })}
                        {/* <ScrollToBottom count={messages.length} /> */}
                    </div>
                )}
            </div>

            {/* Reply box — pinned to the bottom of the thread */}
            <div className="shrink-0 border-t border-[#c3d4e8] bg-white px-3 py-2.5">
                <BoundForm
                    action={sendMessageAction.bind(null, other._id.toString())}
                    submitLabel="Send"
                    textarea
                    name="body"
                    placeholder={`Message ${other.displayName}...`}
                    rows={2}
                />
            </div>
        </div>
    );
}
