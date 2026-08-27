"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallButton() {
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            void navigator.serviceWorker.register("/sw.js");
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        const handleAppInstalled = () => {
            setInstalled(true);
            setInstallPrompt(null);
        };

        window.addEventListener(
            "beforeinstallprompt",
            handleBeforeInstallPrompt,
        );
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt,
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    if (installed || !installPrompt) return null;

    const handleInstall = async () => {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") setInstalled(true);
        setInstallPrompt(null);
    };

    return (
        <button
            type="button"
            onClick={handleInstall}
            className="sm:hidden shrink-0 whitespace-nowrap text-white font-bold text-[13px] hover:underline py-0.5 px-1 inline-flex items-center gap-1"
            aria-label="Download Genggi app"
        >
            <Download size={13} className="mb-0.5" aria-hidden="true" />
            Download App
        </button>
    );
}
