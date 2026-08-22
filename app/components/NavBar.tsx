import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { countUnread } from "@/lib/queries";
import LogoutButton from "./LogoutButton";

function NavLink({
    href,
    children,
    count,
}: {
    href: string;
    children: React.ReactNode;
    count?: number;
}) {
    return (
        <Link
            href={href}
            className="text-[#003399] font-bold no-underline hover:underline py-0.5 inline-flex items-center gap-1"
        >
            {children}
            {!!count && (
                <span className="bg-[#cc3399] text-white text-[10px] rounded-full px-1 leading-tight">
                    {count}
                </span>
            )}
        </Link>
    );
}

export default async function NavBar() {
    const user = await getCurrentUser();
    let counts = { messages: 0, friendRequests: 0, notifications: 0 };
    if (user) counts = await countUnread(user._id.toString());

    return (
        <header>
            <div className="bg-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl sm:text-2xl sm:text-center tracking-tight">
                <Link href="/" className="no-underline text-white">
                    <img
                        src="/images/genggeng-logo4.png"
                        alt="genggeng"
                        className="h-10 w-10 inline-block object-cover rounded"
                    />{" "}
                    genggeng<span className="text-[#ffde00]">.pro</span>
                </Link>
            </div>
            <nav className="bg-[#dbe9f7] border-b border-[#6699cc] px-2.5 py-1 text-[12px] sm:text-[13px] flex flex-wrap gap-x-2.5 gap-y-0.5 sm:justify-center">
                {user ? (
                    <>
                        <NavLink href="/">Home</NavLink>
                        <NavLink href={`/${user.username}`}>
                            My Profile
                        </NavLink>
                        <NavLink href="/friends" count={counts.friendRequests}>
                            Friends
                        </NavLink>
                        <NavLink href="/messages" count={counts.messages}>
                            Messages
                        </NavLink>
                        <NavLink href="/search">Search</NavLink>
                        <NavLink
                            href="/notifications"
                            count={counts.notifications}
                        >
                            Notifications
                        </NavLink>
                        <NavLink href="/edit">Edit Profile</NavLink>
                        {user.role === "admin" && (
                            <NavLink href="/admin">Admin</NavLink>
                        )}
                        <LogoutButton />
                    </>
                ) : (
                    <>
                        <NavLink href="/">Home</NavLink>
                        <NavLink href="/login">Login</NavLink>
                        <NavLink href="/signup">Create Account</NavLink>
                    </>
                )}
            </nav>
        </header>
    );
}
