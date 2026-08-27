"use client";

import { useTransition, useState } from "react";
import { adminSetBulletinPostLimitAction } from "@/app/actions";

export default function BulletinPostLimit({
    currentLimit,
}: {
    currentLimit: number | null;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [value, setValue] = useState(
        currentLimit === null ? "" : String(currentLimit),
    );

    return (
        <div>
            <div className="flex gap-1.5 items-center">
                <input
                    type="number"
                    min={0}
                    max={1000}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError("");
                        setSuccess("");
                    }}
                    placeholder="e.g. 10"
                    className="input w-24"
                />
                <span className=" text-gray-600">posts per hour</span>
                <button
                    type="button"
                    disabled={pending}
                    className="btn"
                    onClick={() => {
                        setError("");
                        setSuccess("");
                        startTransition(async () => {
                            const res =
                                await adminSetBulletinPostLimitAction(value);
                            if (res && "error" in res && res.error)
                                setError(res.error);
                            else setSuccess("Limit saved.");
                        });
                    }}
                >
                    {pending ? "..." : "Save"}
                </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
                {currentLimit === null
                    ? "Currently: no limit"
                    : `Currently: ${currentLimit} per hour`}
            </p>
            {error && <p className="text-red-600 text-[11px] mt-1">{error}</p>}
            {success && (
                <p className="text-green-600 text-[11px] mt-1">{success}</p>
            )}
        </div>
    );
}
