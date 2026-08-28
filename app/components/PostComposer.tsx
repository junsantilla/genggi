"use client";

import { useRef, useState } from "react";
import { Globe, Lock, Users } from "lucide-react";
import {
    compressImageForUpload,
    MAX_UPLOAD_BYTES,
} from "@/lib/compress-image";

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
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const compressedRef = useRef<File | null>(null);
    const compressPromiseRef = useRef<Promise<void> | null>(null);
    const remaining = 1000 - body.length;
    const [visibility, setVisibility] = useState("public");
    const privacyLabel =
        visibility === "private"
            ? "Only me"
            : visibility === "friends"
              ? "Friends"
              : "Public";
    const VisibilityIcon =
        visibility === "private"
            ? Lock
            : visibility === "friends"
              ? Users
              : Globe;

    return (
        <form
            ref={formRef}
            action={async (formData) => {
                if (pending) return;
                setPending(true);
                setError("");
                setPosted(false);
                try {
                    if (compressPromiseRef.current)
                        await compressPromiseRef.current;
                    const file = compressedRef.current;
                    if (file) formData.set("photo", file);
                    const result = await action(formData);
                    if (result.error) {
                        setError(result.error);
                        return;
                    }
                    setBody("");
                    setFileName("");
                    setPosted(true);
                    formRef.current?.reset();
                    compressedRef.current = null;
                    compressPromiseRef.current = null;
                    onPosted?.();
                } catch {
                    setError(
                        "Something went wrong while posting. Please try again."
                    );
                } finally {
                    setPending(false);
                }
            }}
            className="border-b border-[#99bbdd] bg-[#DBE9F7] p-2.5 mb-3"
        >
            <div className="relative">
                <textarea
                    name="body"
                    rows={2}
                    maxLength={1000}
                    value={body}
                    onChange={(event) => {
                        setBody(event.target.value);
                        setError("");
                        setPosted(false);
                    }}
                    disabled={pending}
                    className="input w-full resize-none pr-16 bg-white"
                    placeholder={placeholder}
                />
                <span
                    className={`absolute right-2 bottom-2 text-[10px] ${remaining < 100 ? "text-orange-600 font-bold" : "text-gray-400"}`}
                >
                    {remaining}
                </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
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
                        ref={fileInputRef}
                        onChange={(event) => {
                            setError("");
                            setPosted(false);
                            compressedRef.current = null;
                            compressPromiseRef.current = null;
                            const f = event.target.files?.[0];
                            if (!f) {
                                setFileName("");
                                return;
                            }
                            if (!f.type.startsWith("image/")) {
                                setFileName("");
                                if (fileInputRef.current)
                                    fileInputRef.current.value = "";
                                setError("Please upload an image file.");
                                return;
                            }
                            setFileName(f.name);
                            compressPromiseRef.current = compressImageForUpload(f)
                                .then((compressed) => {
                                    if (compressed.size > MAX_UPLOAD_BYTES) {
                                        compressedRef.current = null;
                                        setFileName("");
                                        if (fileInputRef.current)
                                            fileInputRef.current.value = "";
                                        setError("Image must be under 3MB.");
                                        return;
                                    }
                                    compressedRef.current = compressed;
                                })
                                .catch(() => {
                                    compressedRef.current = null;
                                });
                        }}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {showPrivacy && (
                        <>
                            <input
                                type="hidden"
                                name="visibility"
                                value={visibility}
                            />
                            <div className="relative">
                                <button
                                    type="button"
                                    className="flex items-center text-[#003399] font-bold hover:underline p-0.5"
                                    onClick={() =>
                                        setPrivacyOpen((open) => !open)
                                    }
                                    aria-label={`Post privacy: ${privacyLabel}`}
                                    aria-expanded={privacyOpen}
                                    title={`Post privacy: ${privacyLabel}`}
                                >
                                    <VisibilityIcon
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                </button>
                                {privacyOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() =>
                                                setPrivacyOpen(false)
                                            }
                                            aria-hidden="true"
                                        />
                                        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] border border-[#6699cc] bg-[#dbe9f7] p-2 shadow-md">
                                            {[
                                                ["public", "Public"],
                                                ["friends", "Friends"],
                                                ["private", "Only me"],
                                            ].map(([value, label]) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className="block w-full text-left cursor-pointer text-[#003399] font-bold hover:underline py-0.5"
                                                    onClick={() => {
                                                        setVisibility(value);
                                                        setPrivacyOpen(false);
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
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
