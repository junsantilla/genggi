import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { sendMessageAction } from "@/app/actions";
import BoundForm from "@/app/components/BoundForm";
import Box from "@/app/components/Box";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const user = await requireUser();
  const { to } = await searchParams;
  const db = getDb();
  const uid = user._id.toString();

  const messages = await db
    .collection("messages")
    .find({ $or: [{ senderId: user._id }, { recipientId: user._id }] })
    .sort({ createdAt: -1 })
    .toArray();

  // Group by counterpart
  const threads = new Map<string, { messages: (typeof messages)[number][] }>();
  for (const m of messages) {
    const other = m.senderId.toString() === uid ? m.recipientId.toString() : m.senderId.toString();
    if (!threads.has(other)) threads.set(other, { messages: [] });
    threads.get(other)!.messages.push(m);
  }

  const counterpartIds = [...threads.keys()];
  const counterparts =
    counterpartIds.length > 0
      ? await db.collection("users").find({ _id: { $in: counterpartIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];
  const nameOf = (id: string) =>
    counterparts.find((c) => c._id.toString() === id)?.displayName || "Unknown";

  // Compose target
  let composeTarget = null;
  if (to) {
    composeTarget = await db.collection("users").findOne({ username: to });
  }

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        💬 Messages
      </div>
      <div className="p-4 flex flex-col gap-4">
        <Box title={composeTarget ? `Compose to ${composeTarget.displayName}` : "Compose"}>
          {composeTarget ? (
            <BoundForm
              action={sendMessageAction.bind(null, composeTarget._id.toString())}
              submitLabel="Send Message"
              textarea
              name="body"
              placeholder={`Write to ${composeTarget.displayName}...`}
              rows={3}
            />
          ) : (
            <p className="text-gray-500 italic text-[12px]">
              Visit someone&apos;s profile and hit “Send Message”, or type a username below:
            </p>
          )}
          {!composeTarget && (
            <form action="/messages" method="get" className="mt-2 flex gap-1.5">
              <input name="to" placeholder="username" className="input" />
              <button type="submit" className="btn">
                Compose
              </button>
            </form>
          )}
        </Box>

        <Box title={`Inbox (${threads.size} conversations)`}>
          {threads.size === 0 ? (
            <p className="text-gray-500 italic text-[12px]">No messages yet.</p>
          ) : (
            [...threads.entries()].map(([otherId, { messages: msgs }]) => {
              const unread = msgs.filter((m) => m.recipientId.toString() === uid && !m.read).length;
              const last = msgs[0];
              const lastFromMe = last.senderId.toString() === uid;
              return (
                <Link
                  key={otherId}
                  href={`/messages/${otherId}`}
                  className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0 no-underline"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#003399] font-bold shrink-0">{nameOf(otherId)}</span>
                    <span className="text-gray-500 text-[12px] truncate">
                      {lastFromMe ? "You: " : ""}
                      {last.body}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-[11px]">{timeAgo(last.createdAt)}</span>
                    {unread > 0 && (
                      <span className="bg-[#cc3399] text-white text-[11px] rounded-full px-1.5">
                        {unread} new
                      </span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </Box>
      </div>
    </div>
  );
}
