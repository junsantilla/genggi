import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import {
  respondFriendRequestAction,
  removeFriendAction,
} from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";
import FriendSearch from "@/app/components/FriendSearch";

export default async function FriendsPage() {
  const user = await requireUser();
  const db = getDb();
  const uid = user._id.toString();

  const [approved, incoming, outgoing] = await Promise.all([
    db
      .collection("friendships")
      .find({
        status: "approved",
        $or: [{ requesterId: user._id }, { addresseeId: user._id }],
      })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("friendships")
      .find({ addresseeId: user._id, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
    db
      .collection("friendships")
      .find({ requesterId: user._id, status: "pending" })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  const friendIds = approved.map((f) =>
    f.requesterId.toString() === uid ? f.addresseeId : f.requesterId
  );
  const incomingIds = incoming.map((f) => f.requesterId);
  const outgoingIds = outgoing.map((f) => f.addresseeId);

  const [friends, incomingUsers, outgoingUsers] = await Promise.all([
    friendIds.length ? db.collection("users").find({ _id: { $in: friendIds } }).toArray() : Promise.resolve([]),
    incomingIds.length ? db.collection("users").find({ _id: { $in: incomingIds } }).toArray() : Promise.resolve([]),
    outgoingIds.length ? db.collection("users").find({ _id: { $in: outgoingIds } }).toArray() : Promise.resolve([]),
  ]);

  const top8 = [...friends].slice(0, 8);
  const recent = [...friends]
    .map((f) => {
      const fs = approved.find(
        (x) =>
          (x.requesterId.toString() === uid && x.addresseeId.toString() === f._id.toString()) ||
          (x.requesterId.toString() === f._id.toString() && x.addresseeId.toString() === uid)
      );
      return { friend: f, at: fs?.respondedAt || fs?.createdAt };
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        👥 Friends
      </div>
      <div className="p-4 flex flex-col gap-4">
        <Box title={`Top 8 (${top8.length})`}>
          {top8.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">You don&apos;t have any friends yet.</p>
          ) : (
            <div className="grid grid-cols-2 min-[361px]:grid-cols-3 sm:grid-cols-4 gap-1.5">
              {top8.map((f) => (
                <div key={f._id.toString()} className="text-center text-[11px]">
                  <Link href={`/${f.username}`} className="block">
                    {f.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.photo} alt={f.displayName} className="w-[60px] h-[60px] object-cover border border-[#cc99cc] mx-auto mb-0.5" />
                    ) : (
                      <div className="friend-thumb-bg w-[60px] h-[60px] border border-[#cc99cc] mx-auto mb-0.5"></div>
                    )}
                  </Link>
                  <Link href={`/${f.username}`} className="text-[#003399] no-underline font-bold">
                    {f.displayName}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Box>

        <Box title={`Friend Requests (${incoming.length})`}>
          {incoming.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">No pending requests.</p>
          ) : (
            incomingUsers.map((f) => {
              const fr = incoming.find((x) => x.requesterId.toString() === f._id.toString());
              return (
                <div key={f._id.toString()} className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/${f.username}`} className="flex shrink-0">
                      {f.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.photo} alt={f.displayName} className="w-9 h-9 object-cover border border-[#cc99cc]" />
                      ) : (
                        <div className="friend-thumb-bg w-9 h-9 border border-[#cc99cc]"></div>
                      )}
                    </Link>
                    <div>
                      <Link href={`/${f.username}`} className="text-[#003399] font-bold no-underline">
                        {f.displayName}
                      </Link>
                      <div className="text-gray-500 text-[11px]">{timeAgo(fr?.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <ActionButton
                      action={respondFriendRequestAction.bind(null, fr!._id.toString(), true)}
                      className="btn"
                    >
                      Accept
                    </ActionButton>
                    <ActionButton
                      action={respondFriendRequestAction.bind(null, fr!._id.toString(), false)}
                      className="btn btn-danger"
                    >
                      Decline
                    </ActionButton>
                  </div>
                </div>
              );
            })
          )}
        </Box>

        <Box title={`Requests Sent (${outgoing.length})`}>
          {outgoing.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">None pending.</p>
          ) : (
            outgoingUsers.map((f) => (
              <div key={f._id.toString()} className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0">
                <div className="flex items-center gap-2">
                  <Link href={`/${f.username}`} className="flex shrink-0">
                    {f.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.photo} alt={f.displayName} className="w-9 h-9 object-cover border border-[#cc99cc]" />
                    ) : (
                      <div className="friend-thumb-bg w-9 h-9 border border-[#cc99cc]"></div>
                    )}
                  </Link>
                  <Link href={`/${f.username}`} className="text-[#003399] font-bold no-underline">
                    {f.displayName}
                  </Link>
                </div>
                <span className="text-gray-500 text-[11px] italic">awaiting response…</span>
              </div>
            ))
          )}
        </Box>

        <Box title={`Recent Activity (${recent.length})`}>
          {recent.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">Nothing yet.</p>
          ) : (
            recent.map(({ friend, at }) => (
              <div key={friend._id.toString()} className="flex items-center gap-2 border-b border-dotted border-[#99bbdd] py-1 last:border-0 text-[12px]">
                <Link href={`/${friend.username}`} className="flex shrink-0">
                  {friend.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={friend.photo} alt={friend.displayName} className="w-7 h-7 object-cover border border-[#cc99cc]" />
                  ) : (
                    <div className="friend-thumb-bg w-7 h-7 border border-[#cc99cc]"></div>
                  )}
                </Link>
                <div>
                  <Link href={`/${friend.username}`} className="text-[#003399] font-bold no-underline">
                    {friend.displayName}
                  </Link>{" "}
                  became friends {timeAgo(at)}
                </div>
              </div>
            ))
          )}
        </Box>

        <Box title={`All Friends (${friends.length})`}>
          <FriendSearch
            friends={friends.map((f) => ({ username: f.username, displayName: f.displayName }))}
          />
          <div className="mt-2">
            {friends.length === 0 ? (
              <p className="text-gray-500 italic text-[12px]">No friends yet.</p>
            ) : (
              friends.map((f) => {
                const fr = approved.find(
                  (x) =>
                    (x.requesterId.toString() === uid && x.addresseeId.toString() === f._id.toString()) ||
                    (x.requesterId.toString() === f._id.toString() && x.addresseeId.toString() === uid)
                );
                return (
                  <div key={f._id.toString()} className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/${f.username}`} className="flex shrink-0">
                        {f.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.photo} alt={f.displayName} className="w-9 h-9 object-cover border border-[#cc99cc]" />
                        ) : (
                          <div className="friend-thumb-bg w-9 h-9 border border-[#cc99cc]"></div>
                        )}
                      </Link>
                      <Link href={`/${f.username}`} className="text-[#003399] font-bold no-underline">
                        {f.displayName}
                      </Link>
                    </div>
                    <div className="flex gap-1.5">
                      <Link href={`/messages?to=${f.username}`} className="btn no-underline">
                        Message
                      </Link>
                      <ActionButton
                        action={removeFriendAction.bind(null, fr!._id.toString())}
                        className="btn btn-danger"
                        confirmText={`Remove ${f.displayName} as a friend?`}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Box>
      </div>
    </div>
  );
}
