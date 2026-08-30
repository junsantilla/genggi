"use client";

import { useState, useTransition } from "react";
import { applyLayoutAction } from "@/app/actions";

export default function UseLayoutButton({ layoutId, layoutName }: { layoutId: string; layoutName: string }) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    function apply() {
        if (!window.confirm(`Warning: using “${layoutName}” will replace your current profile CSS. Your existing theme styling will be lost unless you save a copy first. Continue?`)) return;
        setError("");
        startTransition(async () => {
            const result = await applyLayoutAction(layoutId);
            if (result.error) setError(result.error);
            else window.alert(`“${layoutName}” is now applied to your profile.`);
        });
    }

    return (
        <div>
            <button type="button" className="btn" onClick={apply} disabled={pending} title="Warning: replaces your current profile CSS">
                {pending ? "Applying..." : "Use Layout"}
            </button>
            {error && <p className="mt-1 text-xs font-bold text-red-600" role="alert">{error}</p>}
        </div>
    );
}
