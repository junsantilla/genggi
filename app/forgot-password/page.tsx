import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ForgotPasswordForm from "@/app/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🔑 Forgot Password
      </div>
      <div className="p-4">
        <p className="text-[12px] text-gray-600 mb-3">
          Enter the email address you signed up with and we&apos;ll send you a
          link to reset your password.
        </p>
        <ForgotPasswordForm />
        <p className="text-center text-[12px] text-gray-500 mt-3">
          Remembered it?{" "}
          <Link href="/login" className="text-[#003399] font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
