"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
            className="shrink-0 whitespace-nowrap text-[#003399] font-bold no-underline hover:underline py-0.5 inline-flex items-center gap-1"
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

export default function NavBar({
    isLoggedIn,
    username,
    isAdmin,
    counts,
}: {
    isLoggedIn: boolean;
    username: string;
    isAdmin: boolean;
    counts: { messages: number; friendRequests: number; notifications: number };
}) {
    const pathname = usePathname();

    // Logged-out visitors get a dedicated landing page with its own header
    // (logo + login form), so the standard navigation bar is hidden there.
    if (!isLoggedIn && pathname === "/") return null;

    return (
        <header className="sticky top-0 z-50">
            <div className="bg-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl sm:text-2xl tracking-tight">
                <div className="mx-auto max-w-[960px]">
                    <Link
                        href="/"
                        className="no-underline text-white inline-flex items-center"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {/* <img
                            src="/images/genggeng-logo4.png"
                            alt="genggeng"
                            className="h-10 w-10 inline-block object-cover rounded mr-1"
                        />{" "} */}
                        Genggi
                    </Link>
                </div>
            </div>
            <nav className="nav-scrollbar-hidden bg-[#dbe9f7] border-b border-[#6699cc] px-2.5 py-1.5 text-[12px] sm:text-[13px] overflow-x-auto overscroll-x-contain">
                <div className="mx-auto flex min-w-max max-w-[960px] items-center justify-between gap-x-6">
                    {isLoggedIn ? (
                        <>
                            <div className="flex items-center gap-x-2.5">
                                <NavLink href={`/${username}`}>
                                    My Profile
                                </NavLink>
                                <NavLink
                                    href="/friends"
                                    count={counts.friendRequests}
                                >
                                    Friends
                                </NavLink>
                                <NavLink
                                    href="/messages"
                                    count={counts.messages}
                                >
                                    Messages
                                </NavLink>
                                <NavLink href="/chatboxes">Chatbox</NavLink>
                                <NavLink href="/search">Search</NavLink>
                                <NavLink
                                    href="/notifications"
                                    count={counts.notifications}
                                >
                                    Notifications
                                </NavLink>
                            </div>
                            <div className="flex items-center gap-x-2.5">
                                <NavLink href="/edit">Edit Profile</NavLink>
                                <NavLink href="/layouts/generator">
                                    Layout Generator
                                </NavLink>
                                {isAdmin && (
                                    <NavLink href="/admin">Admin</NavLink>
                                )}
                                <LogoutButton />
                            </div>
                        </>
                    ) : (
                        <div className="mx-auto flex items-center gap-x-2.5">
                            <NavLink href="/">Home</NavLink>
                            <NavLink href="/login">Login</NavLink>
                            <NavLink href="/signup">Create Account</NavLink>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
}
