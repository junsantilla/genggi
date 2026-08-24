import { requireUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import Box from "@/app/components/Box";
import NotificationLink from "@/app/components/NotificationLink";
import UserAvatar from "@/app/components/UserAvatar";

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
  const actorMap = new Map(actors.map((a) => [a._id.toString(), a]));
  const actorName = (id: string) => actorMap.get(id)?.displayName;
  const actorPhoto = (id: string) => actorMap.get(id)?.photo as string | undefined;

  return (
    <>
      <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🔔 Notifications
      </div>
      <div className="p-4">
        <Box title={`All Notifications (${notifications.length})`}>
          {notifications.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">You&apos;re all caught up!</p>
          ) : (
            <>
              {notifications.map((n) => {
                const aId = n.actorId.toString();
                const photo = actorPhoto(aId);
                const name = actorName(aId);
                return (
                  <div
                    key={n._id.toString()}
                    className={`border-b border-dotted border-[#99bbdd] py-1.5 last:border-0 ${n.read ? "" : "bg-[#fff7d6]"}`}
                  >
                    <div className="flex ite ms-start gap-2">
                      {name ? (
                        <UserAvatar
                          src={photo}
                          alt={name}
                          className="w-6 h-6 object-cover shrink-0"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <NotificationLink
                          notificationId={n._id.toString()}
                          href={n.link}
                          className="text-[#003399] no-underline"
                        >
                          <span className="font-bold">{n.text}</span>
                        </NotificationLink>
                        <div className="text-gray-500 text-[11px]">
                          {name ? `${name} · ` : ""}
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </Box>
      </div>
      </div>
    </>
  );
}
