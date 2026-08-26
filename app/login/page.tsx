import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import AuthForm from "@/app/components/AuthForm";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{
        reset?: string;
        signup?: string;
        verified?: string;
    }>;
}) {
    const user = await getCurrentUser();
    if (user) redirect("/");

    const { reset, signup, verified } = await searchParams;

    return (
        <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                🔑 Login to genggi
            </div>
            <div className="p-4">
                {reset === "1" && (
                    <div
                        className="text-green-700 bg-green-50 border border-green-200 px-2 py-2 text-[12px] font-bold mb-3"
                        role="status"
                    >
                        Password reset! You can now log in with your new
                        password.
                    </div>
                )}
                {signup === "1" && (
                    <div
                        className="text-green-700 bg-green-50 border border-green-200 px-2 py-2 text-[12px] font-bold mb-3"
                        role="status"
                    >
                        Account created! Check your email (and spam folder) to
                        confirm your address before logging in.
                    </div>
                )}
                {verified === "1" && (
                    <div
                        className="text-green-700 bg-green-50 border border-green-200 px-2 py-2 text-[12px] font-bold mb-3"
                        role="status"
                    >
                        Email verified! You can now log in.
                    </div>
                )}
                <AuthForm
                    action={loginAction}
                    fields={[
                        {
                            name: "identifier",
                            label: "Username or Email",
                            type: "text",
                        },
                        {
                            name: "password",
                            label: "Password",
                            type: "password",
                        },
                    ]}
                    submitLabel="Login"
                />
                <p className="text-center text-[12px] text-gray-500 mt-3">
                    No account?{" "}
                    <Link href="/signup" className="text-[#003399] font-bold">
                        Create one here
                    </Link>
                    {" · "}
                    <Link
                        href="/forgot-password"
                        className="text-[#003399] font-bold"
                    >
                        Forgot password?
                    </Link>
                </p>
            </div>
        </div>
    );
}
