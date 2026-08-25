import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import {
    canAccessChatbox,
    getChatboxById,
    getChatboxMessages,
    toChatboxMessageCard,
} from "@/lib/chatbox";
import { deleteChatboxAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";
import ChatboxRoom from "@/app/components/ChatboxRoom";

export default async function ChatboxPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await requireUser();
    const { id } = await params;
    const uid = user._id.toString();

    const chatbox = await getChatboxById(id);
    if (!chatbox) notFound();
    if (!(await canAccessChatbox(chatbox, uid))) notFound();

    const messages = await getChatboxMessages(chatbox._id);
    const isOwner = chatbox.createdBy.toString() === uid;

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                {chatbox.name}
                <span className="block text-[11px] font-normal opacity-80">
                    {chatbox.visibility === "friends"
                        ? "Friends only"
                        : "Public"}
                    {" · "}created {timeAgo(chatbox.createdAt)}
                </span>
            </div>
            <div className="p-3 sm:p-4">
                <Box
                    title={`Messages (${messages.length})`}
                    className="chatbox-room"
                >
                    <ChatboxRoom
                        chatboxId={id}
                        chatboxName={chatbox.name}
                        viewerId={uid}
                        viewerName={user.displayName}
                        viewerPhoto={user.photo}
                        initialMessages={messages.map(toChatboxMessageCard)}
                    />
                </Box>

                <div className="flex items-center justify-between gap-2 mt-3">
                    <Link
                        href="/chatboxes"
                        className="text-[#003399] text-[12px] font-bold no-underline hover:underline"
                    >
                        ← All Chatbox
                    </Link>
                    {isOwner && (
                        <ActionButton
                            action={deleteChatboxAction.bind(null, id)}
                            className="btn btn-danger"
                            confirmText="Delete this chatbox and all its messages? This cannot be undone."
                        >
                            Delete Chatbox
                        </ActionButton>
                    )}
                </div>
            </div>
        </div>
    );
}
