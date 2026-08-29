import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/app/components/NavBar";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { getCurrentUser } from "@/lib/auth";
import { countUnread } from "@/lib/queries";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Genggi",
        template: "%s | Genggi",
    },        description:
        "A nostalgic social network for profiles, friends, messages, and fun.",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: "/images/genggeng-logo4.png",
        apple: "/images/genggeng-logo4.png",
    },
};


export default async function RootLayout({ children }: LayoutProps<"/">) {
    const user = await getCurrentUser();
    const isAdmin = user?.role === "admin";
    const counts = user
        ? await countUnread(
              user._id.toString(),
              user.notificationAcknowledgedAt,
          )
        : { messages: 0, friendRequests: 0, notifications: 0 };

    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="m-0 p-0 font-sans text-[13px] text-black">
                <NavBar
                    isLoggedIn={!!user}
                    username={user?.username ?? ""}
                    isAdmin={isAdmin}
                    counts={counts}
                />
                <main className="py-2 min-h-[calc(100dvh-155px)]">
                    {children}
                </main>
                <footer className="text-gray-400 py-4 border-t border-gray-200 mt-4 bg-[#f5f9ff]">
                    <div className="max-w-[960px] w-full mx-auto px-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <span>© 2026 Genggi</span>
                        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-3 gap-y-1">
                            <Link href="/about" className="underline hover:text-gray-600">
                                About
                            </Link>
                            <Link href="/privacy" className="underline hover:text-gray-600">
                                Privacy
                            </Link>
                            <Link href="/terms" className="underline hover:text-gray-600">
                                Terms
                            </Link>
                            <Link href="/report-bug" className="underline hover:text-gray-600">
                                Report a bug
                            </Link>
                        </nav>
                    </div>
                </footer>
                {process.env.NODE_ENV === "production" && !isAdmin && (
                    <Analytics />
                )}
                {process.env.NODE_ENV === "production" && !isAdmin && (
                    <GoogleTagManager gtmId="G-TKTKE381MM" />
                )}
                {process.env.NODE_ENV === "production" && !isAdmin && (
                    <GoogleAnalytics gaId="G-66BXBYF7CL" />
                )}
            </body>
        </html>
    );
}
