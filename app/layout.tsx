import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/app/components/NavBar";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next"
import { getCurrentUser } from "@/lib/auth"
import { countUnread } from "@/lib/queries"

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
    default: "genggeng.pro",
    template: "%s | genggeng.pro",
  },
  description: "A nostalgic social network for profiles, friends, messages, and fun.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const counts = user
    ? await countUnread(user._id.toString(), user.notificationAcknowledgedAt)
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
        <main className="py-2">{children}</main>
        <footer className="text-center text-[11px] text-gray-400 py-4 border-t border-gray-200 mt-4 space-x-3">
          <span>© 2026 genggeng.pro — made for nostalgic fun.</span>
          <Link href="/report-bug" className="underline hover:text-gray-600">Report a bug</Link>
        </footer>
        {process.env.NODE_ENV === "production" && !isAdmin && <Analytics />}
      </body>
    </html>
  );
}
