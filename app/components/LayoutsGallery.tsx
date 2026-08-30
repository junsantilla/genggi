"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    applyLayoutAction,
    createLayoutAction,
    deleteLayoutAction,
} from "@/app/actions";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";

type Layout = {
    id: string;
    name: string;
    description: string;
    screenshot: string | null;
    css: string;
    authorUsername: string;
    authorId?: string;
};

function truncateDescription(description: string): string {
    return description.length > 60
        ? `${description.slice(0, 60).trimEnd()}...`
        : description;
}

export default function LayoutsGallery({
    initialLayouts,
    currentUserId,
}: {
    initialLayouts: Layout[];
    currentUserId?: string;
}) {
    const [layouts, setLayouts] = useState(initialLayouts);
    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [applyingId, setApplyingId] = useState<string | null>(null);

    function removeLayout(layout: Layout) {
        if (!window.confirm(`Delete “${layout.name}”?`)) return;
        setDeletingId(layout.id);
        startTransition(async () => {
            const result = await deleteLayoutAction(layout.id);
            if (result.error) setError(result.error);
            else
                setLayouts((current) =>
                    current.filter((item) => item.id !== layout.id),
                );
            setDeletingId(null);
        });
    }

    function applyLayout(layout: Layout) {
        const confirmed = window.confirm(
            `Warning: using “${layout.name}” will replace your current profile CSS. Your existing theme styling will be lost unless you save a copy first. Continue?`,
        );
        if (!confirmed) return;

        setError("");
        setApplyingId(layout.id);
        startTransition(async () => {
            const result = await applyLayoutAction(layout.id);
            if (result.error) setError(result.error);
            else
                window.alert(
                    `“${layout.name}” is now applied to your profile.`,
                );
            setApplyingId(null);
        });
    }

    function submit(formData: FormData) {
        setError("");
        startTransition(async () => {
            const result = await createLayoutAction({}, formData);
            if (result.error) {
                setError(result.error);
                return;
            }
            const name = String(formData.get("name"));
            const description = String(formData.get("description") || "");
            const css = String(formData.get("css") || "");
            setLayouts((current) => [
                {
                    id: result.layout?.id ?? crypto.randomUUID(),
                    name,
                    description,
                    screenshot: result.layout?.screenshot ?? null,
                    css,
                    authorUsername: "you",
                    authorId: "current-user",
                },
                ...current,
            ]);
            setModalOpen(false);
        });
    }

    return (
        <div className="mx-auto w-full max-w-[960px]">
            <div className="mb-3 flex items-center justify-between border border-[#6699cc] bg-[#dbe9f7] p-2">
                <div>
                    <h1 className="text-lg font-bold text-[#2c4d80]">
                        Layouts Gallery
                    </h1>
                    <p className="text-xs">
                        Browse layouts shared by the Genggi community.
                    </p>
                </div>{" "}
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setModalOpen(true)}
                    >
                        Add layout
                    </button>
                    <Link
                        href="/layouts/generator"
                        className="btn no-underline"
                    >
                        Layout Generator
                    </Link>
                </div>
            </div>

            {layouts.length === 0 ? (
                <div className="border border-[#6699cc] bg-white p-6 text-center text-sm">
                    No layouts yet. Be the first to add one!
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {layouts.map((layout) => (
                        <article
                            key={layout.id}
                            className="border border-[#6699cc] bg-white"
                        >
                            <Link
                                href={`/layouts/${layout.id}`}
                                className="flex h-36 items-center justify-center bg-[#f5f9ff] no-underline"
                                aria-label={`View ${layout.name}`}
                            >
                                {layout.screenshot ? (
                                    // User-provided screenshots are intentionally rendered as external previews.
                                    <img
                                        src={optimizeCloudinaryUrl(
                                            layout.screenshot,
                                            { width: 480, height: 220 },
                                        )}
                                        alt={`${layout.name} screenshot`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs text-gray-500">
                                        No screenshot
                                    </span>
                                )}
                            </Link>
                            <div className="p-2">
                                <h2 className="font-bold">
                                    <Link
                                        href={`/layouts/${layout.id}`}
                                        className="text-[#003399] no-underline hover:underline"
                                    >
                                        {layout.name}
                                    </Link>
                                </h2>
                                <p className="mt-1 min-h-10 text-xs text-gray-700">
                                    {layout.description
                                        ? truncateDescription(
                                              layout.description,
                                          )
                                        : "No description provided."}
                                </p>
                                <p className="mt-2 text-[11px] text-gray-500">
                                    Added by{" "}
                                    <Link
                                        href={`/${layout.authorUsername}`}
                                        className="font-bold text-[#003399] no-underline hover:underline"
                                    >
                                        {layout.authorUsername}
                                    </Link>
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <Link
                                        href={`/layouts/${layout.id}`}
                                        className="btn no-underline"
                                    >
                                        View
                                    </Link>
                                    {currentUserId && (
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => applyLayout(layout)}
                                            disabled={applyingId === layout.id}
                                            title="Warning: replaces your current profile CSS"
                                        >
                                            {applyingId === layout.id
                                                ? "Applying..."
                                                : "Use Layout"}
                                        </button>
                                    )}
                                    {layout.authorId === currentUserId && (
                                        <button
                                            type="button"
                                            className="btn btn-danger"
                                            onClick={() => removeLayout(layout)}
                                            disabled={deletingId === layout.id}
                                        >
                                            {deletingId === layout.id
                                                ? "Deleting..."
                                                : "Delete"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-layout-title"
                >
                    <form
                        action={submit}
                        encType="multipart/form-data"
                        className="w-full max-w-lg border border-[#2c4d80] bg-white shadow-lg"
                    >
                        <div className="flex items-center justify-between bg-[#2c4d80] px-3 py-2 text-white">
                            <h2 id="add-layout-title" className="font-bold">
                                Add layout
                            </h2>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-3 p-3">
                            <label className="block">
                                <span className="label">Name *</span>
                                <input
                                    name="name"
                                    className="input"
                                    required
                                    maxLength={80}
                                />
                            </label>
                            <label className="block">
                                <span className="label">Description *</span>
                                <textarea
                                    name="description"
                                    className="input"
                                    rows={3}
                                    maxLength={500}
                                />
                            </label>
                            <label className="block">
                                <span className="label">Screenshot *</span>
                                <input
                                    name="screenshot"
                                    type="file"
                                    accept="image/*"
                                    className="input btn-file"
                                    required
                                />
                            </label>
                            <label className="block">
                                <span className="label">CSS *</span>
                                <textarea
                                    name="css"
                                    className="input"
                                    rows={8}
                                    maxLength={20000}
                                    required
                                    spellCheck={false}
                                    placeholder=".profile-page { ... }"
                                />
                            </label>
                            {error && (
                                <p
                                    className="profile-generator-error"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    disabled={pending}
                                >
                                    {pending ? "Saving..." : "Save layout"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
