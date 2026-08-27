"use client";

import { useActionState } from "react";
import { getYouTubeWatchUrl } from "@/lib/utils";

type ThemeState = { ok?: boolean; error?: string };
type ThemeAction = (
    formData: FormData,
) => Promise<{ ok?: boolean; error?: string }>;

export default function ThemeForm({
    action,
    border,
    customCss,
    youtubeVideoId,
}: {
    action: ThemeAction;
    border: string;
    customCss?: string;
    youtubeVideoId?: string;
}) {
    const [state, formAction, pending] = useActionState(
        async (_prev: ThemeState, formData: FormData): Promise<ThemeState> => {
            try {
                const result = await action(formData);
                return result?.error ? { error: result.error } : { ok: true };
            } catch {
                return {
                    error: "Could not save your theme. Please try again.",
                };
            }
        },
        { error: "" },
    );

    return (
        <form action={formAction} className="grid grid-cols-2 gap-2.5">
            <div>
                <label className="label">Border color</label>
                <input
                    type="color"
                    name="border"
                    defaultValue={border}
                    className="input h-8 p-0.5"
                />
            </div>
            <div className="col-span-2">
                <label className="label" htmlFor="profile-youtube-url">
                    YouTube music
                </label>
                <p className="text-gray-500 text-[11px] mb-1">
                    Paste a YouTube video link to add autoplaying music to your
                    profile. Browsers may require visitors to click Turn on
                    sound.
                </p>
                <input
                    id="profile-youtube-url"
                    name="youtubeUrl"
                    type="url"
                    defaultValue={
                        youtubeVideoId ? getYouTubeWatchUrl(youtubeVideoId) : ""
                    }
                    maxLength={500}
                    className="input"
                    placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-gray-500 text-[10px] mt-1">
                    Leave blank to remove profile music.
                </p>
            </div>
            <div className="col-span-2">
                <label className="label">Custom CSS</label>
                <p className="text-gray-500 text-[11px] mb-1">
                    Add CSS for this profile only. Use the profile class names
                    below to target specific sections.
                </p>
                <textarea
                    name="customCss"
                    defaultValue={customCss || ""}
                    maxLength={12000}
                    rows={12}
                    spellCheck={false}
                    className="input font-mono  leading-relaxed"
                    placeholder={`/* Full-width background + centered content */\n.profile-page {\n  background: #fff0f8 url("https://example.com/background.jpg") center top / cover fixed;\n}\n\n.profile-content {\n  background: rgba(255, 255, 255, 0.95);\n}\n\n.profile-page .profile-friends .box-title {\n  background: #cc3399 !important;\n}`}
                />
                <p className="text-gray-500 text-[11px] mt-1">
                    Hooks: .profile-page, .profile-content, .profile-intro,
                    .profile-photo, .profile-actions, .profile-details,
                    .profile-views, .profile-interests, .profile-music,
                    .profile-about, .profile-meet, .profile-testimonials,
                    .bulletin-board, .profile-sidebar, .profile-friends,
                    .profile-friends-grid, .profile-friend-card,
                    .profile-friend-photo, .profile-footer
                </p>
            </div>
            <div className="col-span-2">
                {state.error && (
                    <div
                        className="text-red-600  font-bold bg-red-50 border border-red-200 px-2 py-1 mb-2"
                        role="alert"
                    >
                        {state.error}
                    </div>
                )}
                {state.ok && (
                    <div
                        className="text-green-700  font-bold bg-green-50 border border-green-200 px-2 py-1 mb-2"
                        role="status"
                    >
                        Saved!
                    </div>
                )}
                <button type="submit" disabled={pending} className="btn">
                    {pending ? "Saving..." : "Save Theme"}
                </button>
            </div>
        </form>
    );
}
