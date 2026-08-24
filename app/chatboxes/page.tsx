import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { getAvailableChatboxes } from "@/lib/chatbox";
import Box from "@/app/components/Box";
import CreateChatboxForm from "@/app/components/CreateChatboxForm";
import UserAvatar from "@/app/components/UserAvatar";

function ChatboxAvatar({
  photo,
  name,
  size = "w-10 h-10 text-base",
}: {
  photo: string | null;
  name: string;
  size?: string;
}) {
  return (
    <UserAvatar
      src={photo}
      alt={name}
      className={`${size} object-cover shrink-0`}
    />
  );
}

export default async function ChatboxesPage() {
  const user = await requireUser();
  const uid = user._id.toString();
  const boxes = await getAvailableChatboxes(uid);

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        💬 Chatbox
      </div>
      <div className="p-4 flex flex-col gap-4">
        <Box title="Create a Chatbox">
          <p className="text-[12px] text-gray-600 mb-3">
            Make a chatbox and set it to public (anyone can join) or friends
            only.
          </p>
          <CreateChatboxForm />
        </Box>

        <Box title={`Join a Chatbox (${boxes.length})`}>
          {boxes.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">
              No chatboxes available yet. Create the first one!
            </p>
          ) : (
            <div className="divide-y divide-dotted divide-[#99bbdd]">
              {boxes.map((b) => {
                const mine = b.createdBy === uid;
                return (
                  <Link
                    key={b._id}
                    href={`/chatboxes/${b._id}`}
                    className="flex items-center gap-3 py-2.5 group no-underline hover:bg-[#f0f6ff] px-1.5 -mx-1.5"
                  >
                    <ChatboxAvatar photo={b.author.photo} name={b.author.displayName} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[#003399] font-bold group-hover:underline">
                          {b.name}
                        </span>
                        {mine && (
                          <span className="px-1 text-[10px] font-bold bg-[#ffeec2] text-[#8a6d00]">
                            Yours
                          </span>
                        )}
                        <span
                          className={`px-1 text-[10px] font-bold ${
                            b.visibility === "public"
                              ? "bg-[#dbe9f7] text-[#2c4d80]"
                              : "bg-[#f3e6f7] text-[#8a2b9a]"
                          }`}
                        >
                          {b.visibility === "public" ? "Public" : "Friends only"}
                        </span>
                      </div>
                      <div className="text-gray-500 text-[11px] truncate">
                        {b.author.displayName}
                        {b.messageCount > 0
                          ? ` · ${b.messageCount} ${
                              b.messageCount === 1 ? "message" : "messages"
                            } · last ${timeAgo(b.lastMessageAt!)}`
                          : " · no messages yet"}
                      </div>
                    </div>

                    <span className="text-[#003399] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 font-bold text-[12px]">
                      Join →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Box>
      </div>
    </div>
  );
}
