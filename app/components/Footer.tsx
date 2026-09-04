"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();
    if (pathname === "/messages" || pathname.startsWith("/messages/")) {
        return null;
    }

    return (
        <footer className="text-gray-600 py-4 border-t border-gray-200 bg-[#f5f9ff]">
            <div className="max-w-[960px] w-full mx-auto px-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <Link href="/" className="hover:text-primary">
                    © 2026 <span className="font-bold">Genggi</span>
                </Link>
                <nav
                    aria-label="Footer navigation"
                    className="flex flex-wrap gap-x-3 gap-y-1"
                >
                    <Link
                        href="/about"
                        className="underline hover:text-primary"
                    >
                        About
                    </Link>
                    <Link
                        href="/privacy"
                        className="underline hover:text-primary"
                    >
                        Privacy
                    </Link>
                    <Link
                        href="/terms"
                        className="underline hover:text-primary"
                    >
                        Terms
                    </Link>
                    <Link
                        href="https://github.com/junsantilla/genggi/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-primary"
                    >
                        GitHub
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
