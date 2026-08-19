import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { sendMessageAction, deleteMessageAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import BoundForm from "@/app/components/BoundForm";
import Box from "@/app/components/Box";

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
    <div className="max-w-[640px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        💬 {other.displayName}
      </div>
      <div className="p-4 flex flex-col gap-4">
        <Box title={`Conversation with ${other.displayName}`}>
          {messages.length === 0 ? (
            <p className="text-gray-500 italic text-[11px]">No messages in this conversation yet.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId.toString() === uid;
              return (
                <div key={m._id.toString()} className="py-1.5 border-b border-dotted border-[#99bbdd] last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-[11px] ${mine ? "text-[#cc3399]" : "text-[#003399]"}`}>
                      {mine ? "You" : other.displayName}
                    </span>
                    <span className="text-gray-500 text-[10px]">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap mt-0.5">{m.body}</p>
                  {mine && (
                    <div className="mt-1">
                      <ActionButton
                        action={deleteMessageAction.bind(null, m._id.toString())}
                        className="btn btn-danger"
                        confirmText="Delete this message?"
                      >
                        Delete
                      </ActionButton>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Box>

        <Box title="Reply">
          <BoundForm
            action={sendMessageAction.bind(null, other._id.toString())}
            submitLabel="Send Reply"
            textarea
            name="body"
            placeholder={`Reply to ${other.displayName}...`}
            rows={3}
          />
        </Box>

        <div className="text-center">
          <Link href="/messages" className="text-[#003399] text-[11px]">
            ← Back to Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}
