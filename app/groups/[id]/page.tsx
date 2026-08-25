import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGroupById, getGroupMembership, getGroupPosts } from "@/lib/group";
import { getDb } from "@/lib/db";
import { removeGroupMemberAction, requestGroupJoinAction, reviewGroupJoinAction } from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";
import GroupPostForm from "@/app/components/GroupPostForm";
import GroupPostCard from "@/app/components/GroupPostCard";
import UserAvatar from "@/app/components/UserAvatar";
import DeleteGroupButton from "@/app/components/DeleteGroupButton";

type MemberUser = { _id: { toString(): string }; username: string; displayName: string; photo: string | null };

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const group = await getGroupById(id);
  if (!group) notFound();
  const uid = user._id.toString();
  const membership = await getGroupMembership(group._id, user._id);
  const isOwner = group.ownerId.toString() === uid;
  const canView = group.privacy === "public" || isOwner || membership?.status === "approved";
  const canInteract = membership?.status === "approved";
  const canJoin = !isOwner && membership?.status !== "approved";
  const db = getDb();
  const approvedMembers = (await db.collection("groupMembers").find({ groupId: group._id, status: "approved" }).project({ userId: 1 }).toArray()).map((member) => member.userId);
  const members = (await db.collection("users").find({ _id: { $in: approvedMembers } }).project({ _id: 1, username: 1, displayName: 1, photo: 1 }).sort({ displayName: 1 }).limit(100).toArray()) as unknown as MemberUser[];
  const posts = canView ? await getGroupPosts(group._id) : [];
  const pending = isOwner ? await db.collection("groupMembers").find({ groupId: group._id, status: "pending" }).toArray() : [];
  const pendingUsers = pending.length ? await db.collection("users").find({ _id: { $in: pending.map((m) => m.userId) } }).project({ _id: 1, displayName: 1, username: 1 }).toArray() : [];
  const pendingMap = new Map(pendingUsers.map((member) => [member._id.toString(), member]));

  return <div className="max-w-[960px] w-full mx-auto">
    <div className="bg-white border border-[#6699cc] sm:border-x">
      <div className="flex flex-wrap w-full">
        <main className="w-full sm:w-2/3 p-2.5 pb-0 sm:pb-2.5 sm:pr-[5px]">
          <Box title={`${group.name} (${group.privacy})`} className="bulletin-board">
            {!canView ? <><p className="text-[12px] mb-2">This private group is visible to approved members only.</p>{membership?.status === "pending" ? <p className="text-[12px] text-gray-600">Your join request is pending.</p> : <ActionButton action={requestGroupJoinAction.bind(null, id)} className="btn">Request to join</ActionButton>}</> : <>{canJoin && <div className="mb-2 border border-[#99bbdd] bg-[#f0f6ff] p-2"><p className="text-[12px] mb-1">{membership?.status === "pending" ? "Your join request is pending." : group.privacy === "private" ? "This is a private group." : "Join this group to post and comment."}</p>{membership?.status !== "pending" && <ActionButton action={requestGroupJoinAction.bind(null, id)} className="btn">{group.privacy === "private" ? "Request to join" : "Join group"}</ActionButton>}</div>}
              
              {membership?.status === "approved" && <GroupPostForm groupId={id} />}
              {!canInteract && <p className="text-[11px] text-gray-600 mb-2">Join this group to post, react, or comment.</p>}<div className="mt-2">{posts.length === 0 ? <p className="text-gray-500 italic text-[12px]">No posts yet.</p> : posts.map((post) => <GroupPostCard key={post._id} post={post} groupId={id} currentUserId={uid} canInteract={canInteract} />)}</div>
            </>}
          </Box>
        </main>
        <aside className="w-full sm:w-1/3 p-2.5 pt-0 sm:pt-2.5 sm:pl-[5px]">
          {isOwner && pending.length > 0 && <Box title="Join requests"><div className="border border-[#99bbdd] bg-[#fffaf0] p-2">{pending.map((member) => { const applicant = pendingMap.get(member.userId.toString()); return applicant ? <div key={member._id.toString()} className="flex items-center justify-between gap-2 mt-1 text-[11px]"><Link href={`/${applicant.username}`} className="text-[#003399] font-bold hover:underline">{applicant.displayName} <span className="font-normal">(@{applicant.username})</span></Link><span className="flex gap-1"><ActionButton action={reviewGroupJoinAction.bind(null, id, member.userId.toString(), true)} className="btn text-[10px]">Approve</ActionButton><ActionButton action={reviewGroupJoinAction.bind(null, id, member.userId.toString(), false)} className="btn btn-ghost text-[10px]">Reject</ActionButton></span></div> : null; })}</div></Box>}<Box title={`Members (${members.length})`}>
            {members.length === 0 ? <p className="text-gray-500 italic text-[12px]">No members yet.</p> : <div className="flex flex-col gap-1">{members.map((member) => <div key={member._id.toString()} className="flex items-center gap-2 p-1"><Link href={`/${member.username}`} className="flex items-center gap-2 min-w-0 flex-1 no-underline hover:bg-[#f0f6ff]"><UserAvatar src={member.photo} alt={member.displayName} className="w-8 h-8 object-cover" /><span className="min-w-0"><strong className="block text-[#003399] truncate">{member.displayName}</strong><span className="block text-[10px] text-gray-500 truncate">@{member.username}{member._id.toString() === group.ownerId.toString() ? " · owner" : ""}</span></span></Link>{isOwner && member._id.toString() !== group.ownerId.toString() && <ActionButton action={removeGroupMemberAction.bind(null, id, member._id.toString())} className="btn btn-ghost text-[10px] text-[#cc0000]" confirmText={`Remove ${member.displayName} from this group?`}>Remove</ActionButton>}</div>)}</div>}
          </Box>
          <Box title="About this group"><p className="text-[12px] text-gray-600">{group.privacy === "private" ? "Only approved members can see posts." : "Everyone can see this group's posts."}</p><Link href="/groups" className="inline-block mt-2 text-[#003399] font-bold text-[11px]">← All groups</Link>{isOwner && <div className="mt-3 border-t border-[#ccdded] pt-2"><p className="text-[11px] text-[#990000] mb-1">Warning: deleting this group permanently removes its posts, comments, members, and photos.</p><DeleteGroupButton groupId={id} /></div>}</Box>
        </aside>
      </div>
    </div>
  </div>;
}
