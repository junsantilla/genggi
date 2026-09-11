"use client";

import { Moon, Sun } from "lucide-react";
import { useSiteTheme } from "./SiteThemeProvider";

export default function ThemeToggle({
    className = "",
    variant = "nav",
}: {
    className?: string;
    variant?: "nav" | "ghost" | "icon";
}) {
    const { theme, toggle, mounted } = useSiteTheme();
    const isDark = mounted
        ? theme === "dark"
        : typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark");

    let base: string;
    if (variant === "icon") {
        base = "inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center bg-transparent hover:opacity-70";
    } else if (variant === "ghost") {
        base = "inline-flex min-h-8 min-w-8 items-center justify-center underline hover:text-primary";
    } else {
        base = "inline-flex min-h-8 min-w-8 items-center justify-center border border-[#6699cc] bg-white px-1.5 text-[#2c4d80] hover:bg-[#dbe9f7] dark:border-[#333] dark:bg-black dark:text-[#e8e8e8] dark:hover:bg-[#1a1a1a]";
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            suppressHydrationWarning
            className={`${base} ${className}`}
        >
            {isDark ? (
                <Sun size={16} aria-hidden="true" />
            ) : (
                <Moon size={16} aria-hidden="true" />
            )}
        </button>
    );
}
