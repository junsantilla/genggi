import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/actions";
import AuthForm from "@/app/components/AuthForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="max-w-[420px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        ✨ Create Account
      </div>
      <div className="p-4">
        <AuthForm
          action={signupAction}
          fields={[
            { name: "username", label: "Username (3-20 chars, lowercase)", type: "text" },
            { name: "displayName", label: "Display Name (optional)", type: "text" },
            { name: "email", label: "Email", type: "email" },
            { name: "password", label: "Password (min 6 chars)", type: "password" },
            { name: "confirm", label: "Confirm Password", type: "password" },
          ]}
          submitLabel="Create Account"
        />
        <p className="text-center text-[12px] text-gray-500 mt-3">
          Already have an account?{" "}
          <Link href="/login" className="text-[#003399] font-bold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
