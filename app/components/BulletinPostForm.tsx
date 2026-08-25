"use client";

import { useRef, useState } from "react";
import { createBulletinPostAction } from "@/app/actions";

export default function BulletinPostForm({
    onPosted,
}: {
    onPosted?: () => void;
}) {
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [posted, setPosted] = useState(false);
    const [body, setBody] = useState("");
    const [fileName, setFileName] = useState("");
    const formRef = useRef<HTMLFormElement>(null);

    const maxLength = 1000;
    const remaining = maxLength - body.length;

    return (
        <form
            ref={formRef}
            action={async (fd: FormData) => {
                setPending(true);
                setError("");
                setPosted(false);

                const res = await createBulletinPostAction(fd);

                setPending(false);

                if (res && "error" in res && res.error) {
                    setError(res.error);
                    return;
                }

                setPosted(true);
                setBody("");
                setFileName("");
                formRef.current?.reset();
                onPosted?.();
            }}
            className="border-b border-[#99bbdd] bg-[#DBE9F7] p-2.5 mb-3"
        >
            {/* Composer */}
            <div className="relative">
                <textarea
                    name="body"
                    rows={4}
                    maxLength={maxLength}
                    value={body}
                    onChange={(e) => {
                        setBody(e.target.value);
                        setPosted(false);
                        setError("");
                    }}
                    disabled={pending}
                    className="input w-full resize-none pr-16"
                    placeholder="What's on your mind?"
                />

                <span
                    className={`absolute right-2 bottom-2 text-[10px] ${
                        remaining < 100
                            ? "text-orange-600 font-bold"
                            : "text-gray-400"
                    }`}
                >
                    {remaining}
                </span>
            </div>

            {/* Bottom controls */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Photo */}
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="bulletin-photo"
                            className="btn cursor-pointer max-h-[27px]"
                        >
                            🌄 {fileName ? "Change photo" : "Add photo"}
                        </label>

                        <input
                            id="bulletin-photo"
                            type="file"
                            name="photo"
                            accept="image/*"
                            disabled={pending}
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                setFileName(file ? file.name : "");
                                setError("");
                                setPosted(false);
                            }}
                        />
                    </div>

                    {/* Visibility */}
                    <div className="flex items-center gap-1">
                        {/* <label
                            htmlFor="bulletin-visibility"
                            className="text-[11px] text-gray-600"
                        >
                            👁
                        </label> */}

                        <select
                            id="bulletin-visibility"
                            name="visibility"
                            defaultValue="public"
                            disabled={pending}
                            className="input w-auto text-[11px] py-1"
                        >
                            <option value="public">Public</option>
                            <option value="friends">Friends</option>
                            <option value="private">Only me</option>
                        </select>
                    </div>
                </div>

                {/* Post button */}
                <button
                    type="submit"
                    disabled={pending || (!body.trim() && !fileName)}
                    className="btn min-w-[105px]"
                >
                    {pending ? "Posting..." : "Post"}
                </button>
            </div>

            {/* Selected photo */}
            {fileName && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-600">
                    <span>📎</span>
                    <span className="truncate max-w-[250px]">{fileName}</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    className="mt-2 border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-600"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {/* Success */}
            {posted && (
                <div
                    className="mt-2 border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700"
                    role="status"
                >
                    ✓ Your bulletin was posted successfully.
                </div>
            )}
        </form>
    );
}
