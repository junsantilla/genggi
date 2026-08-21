import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/app/components/NavBar";
import "./globals.css";

import { Analytics } from "@vercel/analytics/next"

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="m-0 p-0 font-sans text-[13px] text-black">
        <NavBar />
        <main className="py-2">{children}</main>
        <footer className="text-center text-[11px] text-gray-400 py-4 border-t border-gray-200 mt-4 space-x-3">
          <span>© 2026 genggeng.pro — made for nostalgic fun.</span>
          <a href="/report-bug" className="underline hover:text-gray-600">Report a bug</a>
        </footer>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
