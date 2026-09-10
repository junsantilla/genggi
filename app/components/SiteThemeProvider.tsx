"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

type SiteTheme = "light" | "dark";

const STORAGE_KEY = "genggi-theme";

const SiteThemeContext = createContext<{
    theme: SiteTheme;
    toggle: () => void;
    setTheme: (theme: SiteTheme) => void;
    mounted: boolean;
}>({
    theme: "light",
    toggle: () => {},
    setTheme: () => {},
    mounted: false,
});

function getInitialTheme(): SiteTheme {
    if (typeof window === "undefined") return "light";
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") return stored;
    } catch {
        // ignore (private mode, etc.)
    }
    if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    }
    return "light";
}

export function SiteThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [theme, setThemeState] = useState<SiteTheme>(getInitialTheme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.style.colorScheme = theme;
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // ignore
        }
    }, [theme]);

    const setTheme = useCallback((next: SiteTheme) => {
        setThemeState(next);
    }, []);

    const toggle = useCallback(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    return (
        <SiteThemeContext.Provider
            value={{ theme, toggle, setTheme, mounted }}
        >
            {children}
        </SiteThemeContext.Provider>
    );
}

export function useSiteTheme() {
    return useContext(SiteThemeContext);
}
