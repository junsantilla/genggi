import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getGroupsForUser } from "@/lib/group";
import Box from "@/app/components/Box";
import CreateGroupForm from "@/app/components/CreateGroupForm";

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await getGroupsForUser(user._id.toString());
  return <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc]">
    <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center">👥 Groups</div>
    <div className="p-4 flex flex-col gap-4">
      <Box title="Create a group"><CreateGroupForm /></Box>
      <Box title={`Groups (${groups.length})`}>
        {groups.length === 0 ? <p className="text-gray-500 italic text-[12px]">No groups yet.</p> : <div className="divide-y divide-dotted divide-[#99bbdd]">
          {groups.map((group) => <Link key={group._id} href={`/groups/${group._id}`} className="flex items-center gap-3 py-2 no-underline hover:bg-[#f0f6ff]">
            {group.photo ? <img src={group.photo} alt="" className="w-12 h-12 object-cover" /> : <div className="w-12 h-12 bg-[#dbe9f7] flex items-center justify-center text-xl">👥</div>}
            <span className="flex-1"><strong className="text-[#003399]">{group.name}</strong><span className="block text-[11px] text-gray-500">{group.privacy === "private" ? "Private" : "Public"}</span></span>
          </Link>)}
        </div>}
      </Box>
    </div>
  </div>;
}
