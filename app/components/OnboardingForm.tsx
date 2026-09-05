"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeOnboardingAction, uploadPhotoAction } from "@/app/actions";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-url";

type Layout = {
    id: string;
    name: string;
    description: string;
    screenshot: string | null;
};

export default function OnboardingForm({
    isGoogleUser,
    initialPhoto,
    layouts,
    initialLayoutId = "none",
}: {
    isGoogleUser: boolean;
    initialPhoto: string | null;
    layouts: Layout[];
    initialLayoutId?: string;
}) {
    const selectedInitialLayout = layouts.some(
        (layout) => layout.id === initialLayoutId,
    )
        ? initialLayoutId
        : "none";
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photo, setPhoto] = useState(initialPhoto);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState("");
    const [photoError, setPhotoError] = useState("");
    const [photoPending, setPhotoPending] = useState(false);
    const [layoutId, setLayoutId] = useState(selectedInitialLayout);
    const [error, setError] = useState("");
    const [pending, startTransition] = useTransition();

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        setPhotoError("");
        setPreview(null);
        setFileName("");
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setPhotoError("Please upload an image file.");
            event.target.value = "";
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setPhotoError("Image must be under 3MB.");
            event.target.value = "";
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => setPreview(String(reader.result));
        reader.readAsDataURL(file);
    }

    async function uploadPhoto() {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setPhotoError("Choose a photo first.");
            return;
        }
        const formData = new FormData();
        formData.set("photo", file);
        setPhotoPending(true);
        setPhotoError("");
        try {
            const result = await uploadPhotoAction(formData);
            if (result.error) {
                setPhotoError(result.error);
                return;
            }
            setPhoto(result.photo || "uploaded");
            setPreview(null);
            setFileName("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch {
            setPhotoError("Photo upload failed. Please try again.");
        } finally {
            setPhotoPending(false);
        }
    }

    function finish() {
        setError("");
        const formData = new FormData();
        formData.set("layoutId", layoutId);
        startTransition(async () => {
            try {
                const result = await completeOnboardingAction(formData);
                if (result?.error) {
                    setError(result.error);
                    return;
                }
                router.push("/");
            } catch {
                setError("Something went wrong. Please try again.");
            }
        });
    }

    const shownPhoto =
        preview || (photo && photo !== "uploaded" ? photo : null);
    const needsPhoto = !isGoogleUser && !photo;

    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-5 md:grid-cols-[250px_minmax(0,1fr)] md:items-start">
                <section className="border border-[#6699cc] bg-[#f5f9ff] p-3">
                    <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#cc3399]">
                                Step 1
                            </p>
                            <h2 className="text-lg font-bold text-[#2c4d80]">
                                Your photo
                            </h2>
                        </div>
                        {photo && (
                            <span className="border border-green-300 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                                Ready
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="group relative mx-auto mb-3 block overflow-hidden border border-[#6699cc] bg-white p-1"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Choose a profile photo"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={
                                shownPhoto
                                    ? preview ||
                                      optimizeCloudinaryUrl(shownPhoto, {
                                          width: 360,
                                          height: 360,
                                      }) ||
                                      shownPhoto
                                    : "/images/avatar.png"
                            }
                            alt="Profile photo preview"
                            className="h-[180px] w-[180px] object-cover transition group-hover:opacity-80"
                        />
                        <span className="absolute inset-x-1 bottom-1 bg-[#2c4d80]/90 py-1 text-center text-[10px] font-bold text-white">
                            Click to choose a photo
                        </span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                    />
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            className="btn w-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {fileName
                                ? "Choose a different photo"
                                : "Choose photo"}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost w-full"
                            disabled={photoPending || !fileName}
                            onClick={uploadPhoto}
                        >
                            {photoPending ? "Uploading..." : "Upload photo"}
                        </button>
                    </div>
                    {isGoogleUser && (
                        <p className="mt-2 pt-2 text-[11px] text-gray-600">
                            Your Google profile photo was imported
                            automatically. You can replace it anytime.
                        </p>
                    )}
                    {needsPhoto && (
                        <p className="mt-2 border border-[#f0b6d9] bg-[#fff5fb] p-2 text-[11px] font-bold text-[#a32670]">
                            Upload a photo to continue.
                        </p>
                    )}
                    {photoError && (
                        <p
                            className="mt-2 text-xs font-bold text-red-600"
                            role="alert"
                        >
                            {photoError}
                        </p>
                    )}
                </section>

                <section>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[#dbe9f7] pb-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-[#cc3399]">
                                Step 2
                            </p>
                            <h2 className="text-xl font-bold text-[#2c4d80]">
                                Pick your profile style
                            </h2>
                            <p className="mt-1 text-sm text-gray-700">
                                Choose a community layout or stay classic. You
                                can change this later.
                            </p>
                        </div>
                        <Link
                            href="/layouts?from=onboarding"
                            className="text-xs font-bold text-[#003399] hover:underline"
                        >
                            Browse all layouts →
                        </Link>
                    </div>

                    <label
                        className={`mb-2 flex cursor-pointer items-start gap-2 border p-3 transition ${
                            layoutId === "none"
                                ? "border-[#2c4d80] bg-[#dbe9f7] shadow-sm"
                                : "border-[#6699cc] bg-white hover:bg-[#f5f9ff]"
                        }`}
                    >
                        <input
                            type="radio"
                            name="layoutId"
                            value="none"
                            checked={layoutId === "none"}
                            onChange={() => setLayoutId("none")}
                            className="mt-0.5"
                        />
                        <span>
                            <strong className="text-[#2c4d80]">
                                Classic Genggi
                            </strong>
                            <span className="block text-xs text-gray-600">
                                Keep the original blue profile style with no
                                custom CSS.
                            </span>
                        </span>
                        {layoutId === "none" && (
                            <span className="ml-auto text-[10px] font-bold text-[#003399]">
                                Selected
                            </span>
                        )}
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {layouts.map((layout) => (
                            <label
                                key={layout.id}
                                className={`group cursor-pointer border p-2 transition ${
                                    layoutId === layout.id
                                        ? "border-[#2c4d80] bg-[#dbe9f7] shadow-sm"
                                        : "border-[#6699cc] bg-white hover:bg-[#f5f9ff]"
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <input
                                        type="radio"
                                        name="layoutId"
                                        value={layout.id}
                                        checked={layoutId === layout.id}
                                        onChange={() => setLayoutId(layout.id)}
                                        className="mt-0.5"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <strong className="truncate text-[#2c4d80]">
                                                {layout.name}
                                            </strong>
                                            {layoutId === layout.id && (
                                                <span className="shrink-0 text-[10px] font-bold text-[#003399]">
                                                    Selected
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </div>
                                {layout.screenshot ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={
                                            optimizeCloudinaryUrl(
                                                layout.screenshot,
                                                {
                                                    width: 600,
                                                    height: 220,
                                                },
                                            ) || layout.screenshot
                                        }
                                        alt={`${layout.name} preview`}
                                        className="mt-2 h-28 w-full border border-[#dbe9f7] object-cover"
                                    />
                                ) : (
                                    <div className="mt-2 flex h-28 items-center justify-center border border-dashed border-[#99bbdd] bg-[#f5f9ff] text-xs text-gray-500">
                                        No preview available
                                    </div>
                                )}
                                <span className="mt-2 block text-xs leading-5 text-gray-600">
                                    {layout.description ||
                                        "Community profile layout"}
                                </span>
                            </label>
                        ))}
                    </div>
                    {layouts.length === 0 && (
                        <p className="border border-dashed border-[#6699cc] bg-[#f5f9ff] p-4 text-center text-sm text-gray-600">
                            No community layouts are available yet. Classic
                            Genggi is selected for you.
                        </p>
                    )}
                </section>
            </div>

            <section className="border-t border-[#dbe9f7] pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[#cc3399]">
                            Step 3
                        </p>
                        <p className="font-bold text-[#2c4d80]">
                            Ready to join the community?
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn w-full py-2 text-sm sm:w-auto sm:min-w-[190px]"
                        disabled={pending || photoPending || needsPhoto}
                        onClick={finish}
                    >
                        {pending ? "Finishing setup..." : "Finish setup →"}
                    </button>
                </div>
                {error && (
                    <p
                        className="mt-3 border border-red-200 bg-red-50 p-2 text-xs font-bold text-red-600"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </section>
        </div>
    );
}
