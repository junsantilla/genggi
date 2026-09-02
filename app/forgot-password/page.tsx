import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "@/app/components/ForgotPasswordForm";
import AuthPageShell from "@/app/components/AuthPageShell";

export default async function ForgotPasswordPage() {
    const user = await getCurrentUser();
    if (user) redirect("/");

    return (
        <AuthPageShell title="Forgot Password">
            <p className="mb-3 text-gray-600">
                Enter the email address you signed up with and we&apos;ll send
                you a link to reset your password.
            </p>
            <ForgotPasswordForm />
            <p className="mt-3 text-center text-gray-500">
                Remembered it?{" "}
                <Link href="/login" className="font-bold text-[#003399]">
                    Login
                </Link>
            </p>
        </AuthPageShell>
    );
}
