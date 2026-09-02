import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import AuthForm from "@/app/components/AuthForm";
import AuthPageShell from "@/app/components/AuthPageShell";
import GoogleLoginButton from "@/app/components/GoogleLoginButton";

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
        <AuthPageShell title="  Login to Genggi">
            {reset === "1" && (
                <div
                    className="mb-3 border border-green-200 bg-green-50 px-2 py-2 font-bold text-green-700"
                    role="status"
                >
                    Password reset! You can now log in with your new password.
                </div>
            )}
            {signup === "1" && (
                <div
                    className="mb-3 border border-green-200 bg-green-50 px-2 py-2 font-bold text-green-700"
                    role="status"
                >
                    Account created! Check your email (and spam folder) to
                    confirm your address before logging in.
                </div>
            )}
            {verified === "1" && (
                <div
                    className="mb-3 border border-green-200 bg-green-50 px-2 py-2 font-bold text-green-700"
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
                    { name: "password", label: "Password", type: "password" },
                ]}
                submitLabel="Login"
            />
            <div className="my-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-gray-200" />
            </div>
            <GoogleLoginButton />
            <p className="mt-3 text-center text-gray-500">
                No account?{" "}
                <Link href="/signup" className="font-bold text-[#003399]">
                    Create one here
                </Link>
                {" · "}
                <Link
                    href="/forgot-password"
                    className="font-bold text-[#003399]"
                >
                    Forgot password?
                </Link>
            </p>
        </AuthPageShell>
    );
}
