"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions";

type ActionResult = { ok?: boolean; error?: string };

export default function ResetPasswordForm({ token }: { token: string }) {
    const [state, formAction, pending] = useActionState(
        async (prev: ActionResult, formData: FormData) => {
            try {
                return await resetPasswordAction(prev, formData);
            } catch {
                return { error: "Something went wrong. Please try again." };
            }
        },
        { error: "" },
    );

    return (
        <form action={formAction} className="flex flex-col gap-2.5">
            <input type="hidden" name="token" value={token} />
            <div>
                <label htmlFor="password" className="label">
                    New Password (min 6 chars)
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    required
                />
            </div>
            <div>
                <label htmlFor="confirm" className="label">
                    Confirm New Password
                </label>
                <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    className="input"
                    required
                />
            </div>
            {state.error && (
                <div
                    className="text-red-600  font-bold bg-red-50 border border-red-200 px-2 py-1"
                    role="alert"
                    aria-live="polite"
                >
                    {state.error}
                </div>
            )}
            <button
                type="submit"
                disabled={pending}
                className="btn py-1.5 text-sm"
            >
                {pending ? "..." : "Reset Password"}
            </button>
        </form>
    );
}
