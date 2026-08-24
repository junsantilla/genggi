"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions";

type ActionResult = { ok?: boolean; error?: string };

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      try {
        return await requestPasswordResetAction(prev, formData);
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    { error: "" }
  );

  if (state.ok) {
    return (
      <div
        className="text-green-700 bg-green-50 border border-green-200 px-2 py-2 text-[12px] font-bold"
        role="status"
      >
        If an account exists for that email, a password reset link is on its
        way. Check your inbox (and spam folder)!
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="input"
          required
        />
      </div>
      {state.error && (
        <div
          className="text-red-600 text-[12px] font-bold bg-red-50 border border-red-200 px-2 py-1"
          role="alert"
          aria-live="polite"
        >
          {state.error}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn py-1.5 text-sm">
        {pending ? "..." : "Send Reset Link"}
      </button>
    </form>
  );
}
