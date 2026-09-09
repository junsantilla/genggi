"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import {
    clearUnpublishedVidsAction,
    finishVidAction,
    deleteVidAction,
} from "@/app/actions";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_EXTENSIONS = /\.(mp4|mov|webm|mkv)$/i;
const ALLOWED_MIME = /^video\/(mp4|quicktime|webm|x-matroska)$/i;

function readableUploadError(status: number): string {
    if (status === 413) {
        return "This video is too large for the upload server. Maximum size is 100 MB.";
    }
    if (status === 401) return "Your session expired. Please sign in again.";
    if (status === 415) return "Unsupported format. Please upload an MP4, MOV, or WebM video.";
    if (status >= 500) {
        return "The video storage service could not accept this upload. Please try again.";
    }
    return "Upload failed. Please try again.";
}

type Phase =
    | "idle" // no file selected
    | "ready" // file selected, preview ready, can upload
    | "uploading"
    | "uploaded" // bytes are in R2, waiting for the user to publish
    | "finalizing" // thumbnail + publish
    | "done";

// Full upload flow: pick -> validate -> preview -> stream to R2 with progress
// -> capture thumbnail frame -> publish metadata. Every client check is
// repeated server-side; the client never writes counters or storage keys.
export default function VidUploadForm() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);

    const [phase, setPhase] = useState<Phase>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [previewPlaying, setPreviewPlaying] = useState(false);
    const [metadata, setMetadata] = useState<{
        duration: number;
        width: number;
        height: number;
    } | null>(null);
    const [caption, setCaption] = useState("");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [vidId, setVidId] = useState<string | null>(null);
    const [clearingUploads, setClearingUploads] = useState(false);

    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    const pickFile = (selected: File | undefined | null) => {
        setError("");
        setMetadata(null);
        setPreviewPlaying(false);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (!selected) {
            setFile(null);
            setFileName("");
            setPhase("idle");
            return;
        }
        if (selected.size > MAX_BYTES) {
            setFile(null);
            setFileName("");
            setPhase("idle");
            setError("File too large. Maximum size is 100 MB.");
            return;
        }
        if (!ALLOWED_EXTENSIONS.test(selected.name) || !ALLOWED_MIME.test(selected.type)) {
            setFile(null);
            setFileName("");
            setPhase("idle");
            setError("Unsupported format. Please upload an MP4, MOV, or WebM video.");
            return;
        }
        setFile(selected);
        setFileName(selected.name);
        setObjectUrl(URL.createObjectURL(selected));
        setPhase("ready");
    };

    const onMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            setError("Could not read this video's metadata. Please try another file.");
            setPhase("idle");
            return;
        }
        setMetadata({
            duration: video.duration || 0,
            width: video.videoWidth,
            height: video.videoHeight,
        });
    }, []);

    const captureThumbnail = useCallback((): Promise<Blob | null> => {
        const video = videoRef.current;
        if (!video) return Promise.resolve(null);
        return new Promise((resolve) => {
            const seek = () => {
                video.removeEventListener("loadeddata", seek);
                const onSeeked = () => {
                    video.removeEventListener("seeked", onSeeked);
                    try {
                        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
                        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
                        const ctx = canvas.getContext("2d");
                        if (!ctx) {
                            resolve(null);
                            return;
                        }
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(
                            (blob) => resolve(blob),
                            "image/jpeg",
                            0.8,
                        );
                    } catch {
                        resolve(null);
                    }
                };
                video.addEventListener("seeked", onSeeked);
                const target = video.duration > 0 ? Math.min(0.1, video.duration / 2) : 0;
                video.currentTime = target;
            };
            if (video.readyState >= 1) {
                seek();
            } else {
                video.addEventListener("loadeddata", seek);
            }
        });
    }, []);

    const startUpload = () => {
        if (!file || !metadata) {
            setError("Please wait for the preview to load.");
            return;
        }
        setError("");
        setProgress(0);
        setPhase("uploading");

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("POST", "/api/vids/upload");
        // Keep this above the server's 5-minute route budget so the user gets
        // a useful timeout message instead of a generic network failure.
        xhr.timeout = 5 * 60 * 1000;
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
            }
        };

        xhr.onload = () => {
            xhrRef.current = null;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText) as { vidId?: string };
                    if (!data.vidId) throw new Error("No vid id returned.");
                    setVidId(data.vidId);
                    // Uploaded and stored — wait for the user to review and
                    // press Publish before the Vid goes live.
                    setPhase("uploaded");
                    setProgress(100);
                } catch {
                    setPhase("idle");
                    setError("Upload failed. Please try again.");
                }
                return;
            }
            let message = readableUploadError(xhr.status);
            try {
                const data = JSON.parse(xhr.responseText) as { error?: string };
                if (data.error) message = data.error;
            } catch {
                // Keep the default message.
            }
            setPhase("ready");
            setError(message);
        };

        xhr.onerror = () => {
            xhrRef.current = null;
            setPhase("ready");
            setError("Network error. Please check your connection and try again.");
        };

        xhr.ontimeout = () => {
            xhrRef.current = null;
            setPhase("ready");
            setError("The upload took too long and timed out. Please try again on a faster connection.");
        };

        xhr.onabort = () => {
            xhrRef.current = null;
            setPhase("ready");
            setError("");
            setProgress(0);
        };

        xhr.send(file);
    };

    const finalize = async (id: string) => {
        setPhase("finalizing");
        // Generate and store the thumbnail. A failure here is non-fatal: the
        // vid can still publish without a poster frame.
        try {
            const thumbnail = await captureThumbnail();
            if (thumbnail) {
                const res = await fetch(`/api/vids/${id}/thumbnail`, {
                    method: "POST",
                    headers: { "Content-Type": "image/jpeg" },
                    body: thumbnail,
                });
                if (!res.ok) {
                    console.warn("Thumbnail upload failed:", res.status);
                }
            }
        } catch {
            console.warn("Thumbnail generation failed.");
        }

        // Publish the metadata.
        const formData = new FormData();
        formData.set("caption", caption);
        formData.set("duration", String(metadata?.duration ?? 0));
        formData.set("width", String(metadata?.width ?? 0));
        formData.set("height", String(metadata?.height ?? 0));
        try {
            const res = await finishVidAction(id, formData);
            if (res.error) {
                setPhase("idle");
                setError(`Processing failed: ${res.error}`);
                return;
            }
            setPhase("done");
            router.push(`/vids/${id}`);
            router.refresh();
        } catch {
            setPhase("idle");
            setError("Processing failed. Please try again.");
        }
    };

    const publish = () => {
        if (!vidId) return;
        setError("");
        finalize(vidId);
    };

    const cancel = async () => {
        if (xhrRef.current) {
            xhrRef.current.abort();
            xhrRef.current = null;
        }
        if (vidId) {
            deleteVidAction(vidId).catch(() => {});
            setVidId(null);
        }
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
        setFile(null);
        setFileName("");
        setPhase("idle");
        setError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const canUpload = phase === "ready" && !!file && !!metadata;

    return (
        <div className="mx-auto max-w-[480px]">
            <div className="mb-2 border border-[#99bbdd] bg-[#dbe9f7] p-2 text-[11px] text-[#2c4d80]">
                📼 Vertical videos up to <b>100 MB</b>. MP4 (H.264) recommended —
                MOV, WebM, and MKV also work.
            </div>

            {error && (
                <div role="alert" className="mb-2 border border-red-300 bg-red-50 p-2 text-[12px] text-red-700">
                    {error}
                </div>
            )}
            {/* Preview */}
            {phase !== "idle" && (
                <div className="relative mx-auto mb-2 aspect-[9/16] w-full max-w-[280px] overflow-hidden border border-[#6699cc] bg-black">
                    {objectUrl && (
                        <>
                            <video
                                ref={videoRef}
                                src={objectUrl}
                                className="h-full w-full object-cover"
                                muted
                                loop
                                playsInline
                                onLoadedMetadata={onMetadata}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const video = videoRef.current;
                                    if (!video) return;
                                    if (video.paused) {
                                        video.play().then(() => setPreviewPlaying(true)).catch(() => {});
                                    } else {
                                        video.pause();
                                        setPreviewPlaying(false);
                                    }
                                }}
                                className="absolute inset-0 flex cursor-pointer items-center justify-center border-0 bg-black/0"
                                aria-label={previewPlaying ? "Pause preview" : "Play preview"}
                            >
                                {!previewPlaying && (
                                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white">
                                        {previewPlaying ? (
                                            <Pause size={26} aria-hidden="true" />
                                        ) : (
                                            <Play size={26} className="ml-0.5" aria-hidden="true" />
                                        )}
                                    </span>
                                )}
                            </button>
                        </>
                    )}
                    {phase === "uploading" && (
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-white">
                            <div className="mb-1 flex justify-between text-[11px] font-bold">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/25">
                                <div
                                    className="h-full bg-[#cc3399] transition-[width] duration-150"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {phase === "finalizing" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <span className="text-white text-[13px] font-bold">
                                Publishing your Vid...
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Caption */}
            <textarea
                name="caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Add a caption... (hashtags like #funny are collected automatically)"
                className="input mb-2 resize-none text-[13px]"
                disabled={phase === "uploading" || phase === "finalizing"}
                aria-label="Caption"
            />

            {phase === "idle" && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
                    className="btn-file input mb-2"
                    onChange={(event) => pickFile(event.target.files?.[0])}
                    aria-label="Choose a video file"
                />
            )}

            {phase !== "idle" && fileName && (
                <p className="mb-2 truncate text-[11px] text-gray-600">
                    📎 {fileName}
                    {metadata
                        ? ` · ${metadata.duration.toFixed(1)}s · ${metadata.width}×${metadata.height}`
                        : " · reading metadata..."}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {phase === "idle" && (
                    <button
                        type="button"
                        className="btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Choose Video
                    </button>
                )}
                {phase === "ready" && canUpload && (
                    <button type="button" className="btn" onClick={startUpload}>
                        Upload Vid
                    </button>
                )}
                {phase === "uploading" && (
                    <button type="button" className="btn btn-danger" onClick={cancel}>
                        Cancel Upload
                    </button>
                )}
                {phase === "uploaded" && (
                    <>
                        <button type="button" className="btn" onClick={publish}>
                            Publish Vid
                        </button>
                        <button type="button" className="btn btn-danger" onClick={cancel}>
                            Cancel
                        </button>
                    </>
                )}
                {(phase === "ready" || phase === "finalizing" || phase === "done") && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={cancel}
                        disabled={phase === "finalizing"}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => router.push("/vids")}
                >
                    Back to Vids
                </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <p className="flex items-center gap-1">
                    <X size={12} aria-hidden="true" /> Cancel at any time — unfinished
                    uploads are cleaned up automatically.
                </p>
                {(phase === "idle" || phase === "ready") && (
                    <button
                        type="button"
                        className="btn btn-ghost text-[11px]"
                        disabled={clearingUploads}
                        onClick={async () => {
                            setClearingUploads(true);
                            setError("");
                            try {
                                const result = await clearUnpublishedVidsAction();
                                if (result.error) setError(result.error);
                                else setError("Unfinished uploads cleared. You can try again now.");
                            } catch {
                                setError("Could not clear unfinished uploads. Please try again.");
                            } finally {
                                setClearingUploads(false);
                            }
                        }}
                    >
                        {clearingUploads ? "Clearing..." : "Clear unfinished uploads"}
                    </button>
                )}
            </div>
        </div>
    );
}