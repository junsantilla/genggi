import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import Box from "@/app/components/Box";
import VidUploadForm from "@/app/components/VidUploadForm";

export const metadata: Metadata = {
    title: "Upload a Vid",
    description: "Share a short vertical video with the Genggi community.",
    robots: { index: false, follow: false },
};

export default async function VidUploadPage() {
    await requireUser();

    return (
        <div className="max-w-[960px] w-full mx-auto">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                Upload a Vid
            </div>
            <div className="pt-4">
                <Box title="New Vid">
                    <VidUploadForm />
                </Box>
            </div>
        </div>
    );
}