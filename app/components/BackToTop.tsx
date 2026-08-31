"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => setVisible(window.scrollY > 320);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!visible) return null;

    return (
        <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-4 right-4 z-40 border border-[#6699cc] bg-secondary px-3 py-1.5 text-[12px] font-bold text-[#003399] shadow-md hover:bg-[#c5daf0] focus:outline-none focus:ring-2 focus:ring-[#6699cc]"
            aria-label="Back to top"
        >
            ↑ Back to top
        </button>
    );
}
