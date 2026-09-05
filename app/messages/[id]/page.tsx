import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import {
  MESSAGE_PAGE_SIZE,
  type Message,
  type SerializedMessage,
} from "@/lib/types";
import { sendMessageAction } from "@/app/actions";
import MessageThread from "@/app/components/MessageThread";
import UserAvatar from "@/app/components/UserAvatar";
import MessageComposer from "@/app/components/MessageComposer";

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

  // Load only the latest page; older history is fetched lazily on scroll-up.
  const latest = (await db
    .collection("messages")
    .find({
      $or: [
        { senderId: user._id, recipientId: other._id },
        { senderId: other._id, recipientId: user._id },
      ],
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(MESSAGE_PAGE_SIZE + 1)
    .toArray()) as unknown as Message[];

  const hasMore = latest.length > MESSAGE_PAGE_SIZE;
  // Reverse so the initial page is in chronological order.
  const page = latest.slice(0, MESSAGE_PAGE_SIZE).reverse();

  const initialMessages: SerializedMessage[] = page.map((m) => ({
    _id: m._id.toString(),
    senderId: m.senderId.toString(),
    recipientId: m.recipientId.toString(),
    body: m.body,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }));

  // Mark incoming messages as read
  const unreadIds = initialMessages
    .filter((m) => m.recipientId === uid && !m.read)
    .map((m) => m._id);
  if (unreadIds.length > 0) {
    await db
      .collection("messages")
      .updateMany(
        { _id: { $in: unreadIds.map((s) => new ObjectId(s)) } },
        { $set: { read: true } },
      );
  }

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x flex flex-col h-[calc(100dvh-97px)]">
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
      <MessageThread
        threadId={other._id.toString()}
        other={{
          displayName: other.displayName,
          username: other.username,
          photo: other.photo,
        }}
        myId={uid}
        myPhoto={user.photo}
        initialMessages={initialMessages}
        hasMoreInitial={hasMore}
      />

      {/* Reply box — pinned to the bottom of the thread */}
      <MessageComposer
        action={sendMessageAction.bind(null, other._id.toString())}
        placeholder={`Message ${other.displayName}...`}
      />
    </div>
  );
}
