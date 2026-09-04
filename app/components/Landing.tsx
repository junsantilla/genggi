import Link from "next/link";
import AuthPageShell from "./AuthPageShell";
import GoogleLoginButton from "./GoogleLoginButton";
import Image from "next/image";
import { getDb } from "@/lib/db";
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarImage,
} from "@/components/ui/avatar";

export default async function Landing() {
    const memberFilter = {
        banned: { $ne: true },
        hideFromSearch: { $ne: true },
        emailVerified: { $ne: false },
    };
    const db = getDb();
    const [recentUsers, memberCount] = await Promise.all([
        db
            .collection("users")
            .find(memberFilter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(10)
            .toArray(),
        db.collection("users").countDocuments(memberFilter),
    ]);

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
                <div className="mt-5 border-t border-[#d5e2f2] pt-4">
                    <AvatarGroup className="justify-center">
                        {recentUsers.map((user) => {
                            const initials =
                                `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
                                user.username.slice(0, 2).toUpperCase();

                            return (
                                <Avatar
                                    key={user._id.toString()}
                                    size="lg"
                                    title={`@${user.username}`}
                                >
                                    <AvatarImage
                                        src={user.photo || "/images/avatar.png"}
                                        alt={`@${user.username}`}
                                    />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                            );
                        })}
                    </AvatarGroup>
                    <p className="mt-3 mb-0 text-xs text-gray-600">
                        Join {memberCount.toLocaleString()} {memberCount === 1 ? "member" : "members"} on Genggi
                    </p>
                </div>
            </div>
        </AuthPageShell>
    );
}
