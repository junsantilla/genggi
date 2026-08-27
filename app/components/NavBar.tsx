"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
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
                <span className="bg-[#cc3399] text-white text-[10px] px-1 leading-tight">
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
    const [menuOpen, setMenuOpen] = useState(false);

    if (!isLoggedIn && pathname === "/") return null;

    return (
        <header className="sticky top-0 z-50">
            <div className="bg-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl sm:text-2xl tracking-tight">
                <div className="mx-auto max-w-[960px]">
                    <div className="flex items-center justify-between">
                        <Link
                            href="/"
                            className="no-underline text-white inline-flex items-center"
                        >
                            <span>Genggi</span>
                            <span className="ml-2 -translate-y-0.5 rounded bg-[#cc3399] px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                                Beta
                            </span>
                        </Link>
                        {isLoggedIn && (
                            <button
                                type="button"
                                className="sm:hidden p-1.5"
                                aria-expanded={menuOpen}
                                aria-label="Toggle account menu"
                                onClick={() => setMenuOpen((open) => !open)}
                            >
                                {menuOpen ? (
                                    <X size={20} aria-hidden="true" />
                                ) : (
                                    <Menu size={20} aria-hidden="true" />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <nav className="nav-scrollbar-hidden bg-[#dbe9f7] border-b border-[#6699cc] px-2.5 py-1.5  sm:text-[13px] overflow-x-auto overscroll-x-contain">
                <div className="mx-auto flex min-w-max max-w-[960px] items-center justify-between gap-x-6">
                    {isLoggedIn ? (
                        <>
                            <div className="flex items-center gap-x-2.5 mr-2.5">
                                <NavLink href="/">Home</NavLink>
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
                            <div className="hidden sm:flex items-center gap-x-2.5">
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
            {isLoggedIn && menuOpen && (
                <div className="absolute right-2.5 top-full z-50 min-w-[190px] border border-[#6699cc] bg-[#dbe9f7] p-2 shadow-md sm:hidden">
                    <div className="flex flex-col items-stretch gap-1">
                        <NavLink href="/edit">Edit Profile</NavLink>
                        <NavLink href="/layouts/generator">
                            Layout Generator
                        </NavLink>
                        {isAdmin && <NavLink href="/admin">Admin</NavLink>}
                        <LogoutButton />
                    </div>
                </div>
            )}
        </header>
    );
}
