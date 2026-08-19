import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { markNotificationsReadAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";

export default async function NotificationsPage() {
  const user = await requireUser();
  const db = getDb();

  const notifications = await db
    .collection("notifications")
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const actorIds = [...new Set(notifications.map((n) => n.actorId.toString()))];
  const actors =
    actorIds.length > 0
      ? await db
          .collection("users")
          .find({ _id: { $in: actorIds.map((id) => new ObjectId(id)) } })
          .toArray()
      : [];
  const actorName = (id: string) =>
    actors.find((a) => a._id.toString() === id)?.displayName;

  return (
    <div className="max-w-[640px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🔔 Notifications
      </div>
      <div className="p-4">
        <Box title={`All Notifications (${notifications.length})`}>
          {notifications.length === 0 ? (
            <p className="text-gray-500 italic text-[11px]">You&apos;re all caught up!</p>
          ) : (
            <>
              <div className="mb-2">
                <ActionButton action={markNotificationsReadAction} className="btn">
                  Mark all as read
                </ActionButton>
              </div>
              {notifications.map((n) => (
                <div
                  key={n._id.toString()}
                  className={`border-b border-dotted border-[#99bbdd] py-1.5 last:border-0 ${n.read ? "" : "bg-[#eef3fb]"}`}
                >
                  <Link href={n.link} className="text-[#003399] no-underline">
                    <span className="font-bold">{n.text}</span>
                  </Link>
                  <div className="text-gray-500 text-[10px]">
                    {actorName(n.actorId.toString()) ? `${actorName(n.actorId.toString())} · ` : ""}
                    {timeAgo(n.createdAt)}
                    {!n.read && <span className="text-[#cc3399] font-bold"> · new</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </Box>
      </div>
    </div>
  );
}
