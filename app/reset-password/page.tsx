import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/app/components/ResetPasswordForm";

export default async function ResetPasswordPage({
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
        🔑 Reset Password
      </div>
      <div className="p-4">
        {!token ? (
          <p className="text-[12px] text-gray-600">
            This reset link is missing or invalid.{" "}
            <Link href="/forgot-password" className="text-[#003399] font-bold">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </div>
  );
}
