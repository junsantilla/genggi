import { getCurrentUser } from "@/lib/auth";
import { getMembersPage } from "@/lib/group";
import Box from "@/app/components/Box";
import MembersFeed from "@/app/components/MembersFeed";

export default async function MembersPage() {
    const currentUser = await getCurrentUser();
    const page = await getMembersPage(currentUser?._id.toString() ?? null);

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                All Members
            </div>
            <div className="p-4">
                <Box title="Members">
                    <>
                        {page.members.length === 0 ? (
                            <p className="text-gray-500 italic text-[12px]">
                                No members found.
                            </p>
                        ) : (
                            <MembersFeed
                                initialMembers={page.members}
                                initialCursor={page.nextCursor}
                            />
                        )}
                    </>
                </Box>
            </div>
        </div>
    );
}
