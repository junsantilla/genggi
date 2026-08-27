import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import VerifyEmailForm from "@/app/components/VerifyEmailForm";
import ResendVerificationForm from "@/app/components/ResendVerificationForm";

export default async function VerifyEmailPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const user = await getCurrentUser();
    if (user) redirect("/");

    const { token } = await searchParams;

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                ✉️ Confirm Your Email
            </div>
            <div className="p-4">
                {token ? (
                    <VerifyEmailForm token={token} />
                ) : (
                    <p className=" text-gray-600 mb-3">
                        We sent you a confirmation link when you created your
                        account. Open it to activate your account. Didn&apos;t
                        get it? Request a new one below.
                    </p>
                )}

                <div className="mt-4 border-t border-[#d6e0f0] pt-4">
                    <p className=" text-gray-600 mb-2">
                        Haven&apos;t received a confirmation email?
                    </p>
                    <ResendVerificationForm />
                </div>

                <p className="text-center  text-gray-500 mt-3">
                    Already verified?{" "}
                    <Link href="/login" className="text-[#003399] font-bold">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
