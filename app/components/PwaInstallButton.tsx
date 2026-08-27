"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallButton() {
    const [installPrompt, setInstallPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            void navigator.serviceWorker.register("/sw.js");
        }

        setInstalled(
            window.matchMedia("(display-mode: standalone)").matches ||
                ("standalone" in window.navigator &&
                    Boolean(
                        (window.navigator as Navigator & {
                            standalone?: boolean;
                        }).standalone,
                    )),
        );

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        const handleAppInstalled = () => {
            setInstalled(true);
            setInstallPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt,
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    if (installed) return null;

    const handleInstall = async () => {
        if (!installPrompt) {
            setShowInstructions((visible) => !visible);
            return;
        }

        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") setInstalled(true);
        setInstallPrompt(null);
    };

    return (
        <div className="relative flex items-center">
            <button
                type="button"
                onClick={handleInstall}
                className="sm:hidden shrink-0 whitespace-nowrap text-white font-bold text-[13px] hover:underline py-0.5 px-1 inline-flex items-center gap-1"
                aria-label="Download Genggi app"
                aria-expanded={showInstructions}
            >
                <Download size={13} className="mb-0.5" aria-hidden="true" />
                Download App
            </button>
            {showInstructions && (
                <div className="absolute right-0 top-full z-50 mt-1 w-72 border border-[#6699cc] bg-white p-2 text-[12px] font-normal leading-snug text-[#003399] shadow-md">
                    {"standalone" in window.navigator ? (
                        <>
                            On iPhone, tap <Share size={13} className="inline-block align-text-bottom" aria-hidden="true" /> <strong>Share</strong>, then choose
                            <strong> Add to Home Screen</strong>.
                        </>
                    ) : (
                        <>
                            Open Chrome&apos;s menu <strong>⋮</strong>, then choose
                            <strong> Install Genggi</strong> or
                            <strong> Add to Home screen</strong>.
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
