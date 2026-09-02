import Link from "next/link";
import AuthPageShell from "./AuthPageShell";
import GoogleLoginButton from "./GoogleLoginButton";
import Image from "next/image";

export default function Landing() {
    return (
        <AuthPageShell showTitle={false}>
            <div className="text-center">
                <div className="flex justify-center" aria-hidden="true">
                    {/* Logo */}
                    <Image
                        src="/images/genggeng-logo4.png"
                        alt="Genggi Logo"
                        width={64}
                        height={64}
                    />
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-[#2c4d80]">
                    Genggi
                </h1>
                <p className="mt-2 text-gray-600">
                    Create a personalized social media profile that feels like
                    you, connect with friends, and bring back the good old days
                    of nostalgic social networking.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                    <Link href="/login" className="btn w-full">
                        Login
                    </Link>
                    <GoogleLoginButton />
                    <Link href="/signup" className="btn btn-ghost w-full">
                        Sign up
                    </Link>
                </div>
            </div>
        </AuthPageShell>
    );
}
