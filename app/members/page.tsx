import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import Box from "@/app/components/Box";

export default async function MembersPage() {
  const currentUser = await getCurrentUser();
  const filter: Record<string, unknown> = {
    banned: { $ne: true },
    hideFromSearch: { $ne: true },
  };
  if (currentUser) filter._id = { $ne: currentUser._id };

  const users = await getDb()
    .collection("users")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        👥 All Members
      </div>
      <div className="p-4">
        <Box title={`Members (${users.length})`}>
          {users.length === 0 ? (
            <p className="text-gray-500 italic text-[11px]">No members found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((user) => (
                <div
                  key={user._id.toString()}
                  className="flex items-center gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0"
                >
                  <Link href={`/u/${user.username}`} className="flex shrink-0">
                    {user.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photo}
                        alt={user.displayName}
                        className="w-14 h-14 object-cover border border-[#cc99cc]"
                      />
                    ) : (
                      <div className="friend-thumb-bg w-14 h-14 border border-[#cc99cc]"></div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/u/${user.username}`}
                      className="text-[#003399] font-bold no-underline"
                    >
                      {user.displayName}
                    </Link>
                    <div className="text-gray-500 text-[10px]">
                      {[user.location, user.gender, user.relationshipStatus]
                        .filter(Boolean)
                        .join(" · ") || `@${user.username}`}
                    </div>
                    <div className="text-gray-500 text-[10px]">
                      joined {timeAgo(user.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Box>
      </div>
    </div>
  );
}
