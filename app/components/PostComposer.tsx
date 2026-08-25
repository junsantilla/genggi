"use client";

import { useRef, useState } from "react";

type PostResult = { ok?: boolean; error?: string };

export default function PostComposer({
    action,
    onPosted,
    placeholder = "What's on your mind?",
    showPrivacy = false,
}: {
    action: (formData: FormData) => Promise<PostResult>;
    onPosted?: () => void;
    placeholder?: string;
    showPrivacy?: boolean;
}) {
    const [body, setBody] = useState("");
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [posted, setPosted] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const remaining = 1000 - body.length;

    return (
        <form
            ref={formRef}
            action={async (formData) => {
                setPending(true);
                setError("");
                setPosted(false);
                const result = await action(formData);
                setPending(false);
                if (result.error) {
                    setError(result.error);
                    return;
                }
                setBody("");
                setFileName("");
                setPosted(true);
                formRef.current?.reset();
                onPosted?.();
            }}
            className="border-b border-[#99bbdd] bg-[#DBE9F7] p-2.5 mb-3"
        >
            <div className="relative">
                <textarea
                    name="body"
                    rows={4}
                    maxLength={1000}
                    value={body}
                    onChange={(event) => {
                        setBody(event.target.value);
                        setError("");
                        setPosted(false);
                    }}
                    disabled={pending}
                    className="input w-full resize-none pr-16"
                    placeholder={placeholder}
                />
                <span
                    className={`absolute right-2 bottom-2 text-[10px] ${remaining < 100 ? "text-orange-600 font-bold" : "text-gray-400"}`}
                >
                    {remaining}
                </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <label
                        htmlFor="post-photo"
                        className="btn cursor-pointer max-h-[27px]"
                    >
                        {fileName ? "Change photo" : "Add photo"}
                    </label>
                    <input
                        id="post-photo"
                        type="file"
                        name="photo"
                        accept="image/*"
                        disabled={pending}
                        className="hidden"
                        onChange={(event) => {
                            setFileName(event.target.files?.[0]?.name ?? "");
                            setError("");
                            setPosted(false);
                        }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {showPrivacy && (
                        <select
                            name="visibility"
                            defaultValue="public"
                            disabled={pending}
                            className="input w-auto text-[11px] py-1"
                            aria-label="Post privacy"
                        >
                            <option value="public">Public</option>
                            <option value="friends">Friends</option>
                            <option value="private">Only me</option>
                        </select>
                    )}
                    <button
                        type="submit"
                        disabled={pending || (!body.trim() && !fileName)}
                        className="btn min-w-[105px]"
                    >
                        {pending ? "Posting..." : "Post"}
                    </button>
                </div>
            </div>
            {fileName && (
                <div className="mt-1.5 text-[10px] text-gray-600">
                    📎 <span className="truncate">{fileName}</span>
                </div>
            )}
            {error && (
                <div role="alert" className="mt-2 text-[11px] text-red-600">
                    {error}
                </div>
            )}
            {posted && (
                <div
                    role="status"
                    className="mt-2 text-[11px] font-bold text-green-700"
                >
                    Posted successfully.
                </div>
            )}
        </form>
    );
}
