import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import AuthForm from "@/app/components/AuthForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🔑 Login to genggeng<span className="text-[#ffde00]">.pro</span>
      </div>
      <div className="p-4">
        <AuthForm
          action={loginAction}
          fields={[
            { name: "identifier", label: "Username or Email", type: "text" },
            { name: "password", label: "Password", type: "password" },
          ]}
          submitLabel="Login"
        />
        <p className="text-center text-[12px] text-gray-500 mt-3">
          No account?{" "}
          <Link href="/signup" className="text-[#003399] font-bold">
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}
