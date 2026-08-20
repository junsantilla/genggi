"use client";

import { useActionState } from "react";

type ThemeState = { ok?: boolean; error?: string };
type ThemeAction = (formData: FormData) => Promise<void>;

export default function ThemeForm({
  action,
  bgTint,
  border,
  customCss,
}: {
  action: ThemeAction;
  bgTint: string;
  border: string;
  customCss?: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ThemeState, formData: FormData): Promise<ThemeState> => {
      try {
        await action(formData);
        return { ok: true };
      } catch {
        return { error: "Could not save your theme. Please try again." };
      }
    },
    { error: "" }
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-2.5">
      <div>
        <label className="label">Background tint</label>
        <input type="color" name="bgTint" defaultValue={bgTint} className="input h-8 p-0.5" />
      </div>
      <div>
        <label className="label">Border color</label>
        <input type="color" name="border" defaultValue={border} className="input h-8 p-0.5" />
      </div>
      <div className="col-span-2">
        <label className="label">Custom CSS</label>
        <p className="text-gray-500 text-[11px] mb-1">
          Add CSS for this profile only. Use the profile class names below to target specific sections.
        </p>
        <textarea
          name="customCss"
          defaultValue={customCss || ""}
          maxLength={12000}
          rows={12}
          spellCheck={false}
          className="input font-mono text-[12px] leading-relaxed"
          placeholder={`/* Full-width background + centered content */\n.profile-page {\n  background: #fff0f8 url("https://example.com/background.jpg") center top / cover fixed;\n}\n\n.profile-content {\n  background: rgba(255, 255, 255, 0.95);\n}\n\n.profile-page .profile-friends .box-title {\n  background: #cc3399 !important;\n}`}
        />
        <p className="text-gray-500 text-[11px] mt-1">
          Hooks: .profile-page, .profile-content, .profile-intro, .profile-photo, .profile-actions, .profile-details,
          .profile-views, .profile-interests, .profile-music, .profile-about, .profile-meet,
          .profile-testimonials, .profile-sidebar, .profile-friends, .profile-friends-grid,
          .profile-friend-card, .profile-friend-photo, .profile-footer
        </p>
      </div>
      <div className="col-span-2">
        {state.error && (
          <div className="text-red-600 text-[12px] font-bold bg-red-50 border border-red-200 px-2 py-1 mb-2" role="alert">
            {state.error}
          </div>
        )}
        {state.ok && (
          <div className="text-green-700 text-[12px] font-bold bg-green-50 border border-green-200 px-2 py-1 mb-2" role="status">
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
