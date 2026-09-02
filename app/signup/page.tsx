import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/actions";
import AuthForm from "@/app/components/AuthForm";
import AuthPageShell from "@/app/components/AuthPageShell";

export default async function SignupPage() {
    const user = await getCurrentUser();
    if (user) redirect("/");

    return (
        <AuthPageShell title="Create Your Genggi Account">
            <AuthForm
                action={signupAction}
                fields={[
                    { name: "username", label: "Username (3-20 chars, lowercase)", type: "text" },
                    { name: "displayName", label: "Display Name", type: "text" },
                    { name: "email", label: "Email", type: "email" },
                    { name: "password", label: "Password (min 6 chars)", type: "password" },
                    { name: "confirm", label: "Confirm Password", type: "password" },
                ]}
                submitLabel="Create Account"
                mathChallenge
            />
            <p className="mt-3 text-center text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-[#003399]">Login</Link>
            </p>
        </AuthPageShell>
    );
}
