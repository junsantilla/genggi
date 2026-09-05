import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import OnboardingForm from "@/app/components/OnboardingForm";

export const metadata: Metadata = {
    title: "Welcome to Genggi",
    description: "Finish setting up your Genggi profile.",
};

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ layout?: string }>;
}) {
    const user = await requireUser();
    if (user.onboardingCompleted !== false) redirect("/");

    const { layout: requestedLayoutId } = await searchParams;
    const layouts = await getDb()
        .collection("layouts")
        .find({})
        .sort({ createdAt: -1 })
        .limit(24)
        .toArray();

    return (
        <div className="mx-auto w-full max-w-[960px] border border-[#6699cc] bg-white sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] px-2.5 py-2 text-center text-xl font-bold tracking-tight text-white">
                Welcome to Genggi
            </div>
            <div className="p-3 sm:p-4">
                <div className="mb-5 border-b border-[#dbe9f7] pb-4 text-center">
                    <p className="text-lg font-bold text-[#2c4d80]">
                        Hi {user.displayName || user.username}!
                    </p>
                    <p className="mt-1 text-gray-700">
                        Let&apos;s make your profile feel like yours. You can change everything later from Edit Profile.
                    </p>
                    <div className="mx-auto mt-4 grid max-w-[560px] grid-cols-3 gap-1 text-[11px] font-bold text-[#2c4d80]">
                        <div className="border border-[#2c4d80] bg-[#dbe9f7] px-2 py-1.5">1. Photo</div>
                        <div className="border border-[#6699cc] bg-[#f5f9ff] px-2 py-1.5">2. Layout</div>
                        <div className="border border-[#6699cc] bg-[#f5f9ff] px-2 py-1.5">3. Finish</div>
                    </div>
                </div>
                <OnboardingForm
                    isGoogleUser={user.authProvider === "google"}
                    initialPhoto={user.photo}
                    initialLayoutId={requestedLayoutId}
                    layouts={layouts.map((layout) => ({
                        id: layout._id.toString(),
                        name: String(layout.name),
                        description: String(layout.description || ""),
                        screenshot: layout.screenshot ? String(layout.screenshot) : null,
                    }))}
                />
                <p className="mt-4 text-center text-[11px] text-gray-500">
                    You can revisit your photo and layout anytime from your profile settings.
                </p>
            </div>
        </div>
    );
}
