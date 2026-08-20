"use client";

import { useActionState } from "react";

type ActionResult = { ok?: boolean; error?: string };

export default function BoundForm({
  action,
  children,
  submitLabel = "Submit",
  className = "",
  submitClassName = "btn",
  textarea = false,
  placeholder = "",
  name = "body",
  rows = 3,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submitLabel?: string;
  className?: string;
  submitClassName?: string;
  textarea?: boolean;
  placeholder?: string;
  name?: string;
  rows?: number;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className={className}>
      {children}
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          placeholder={placeholder}
          className="input"
          required
        />
      ) : (
        <input name={name} placeholder={placeholder} className="input" required />
      )}
      {state.error && <div className="text-red-600 text-[11px] mt-1">{state.error}</div>}
      <div className="mt-1.5">
        <button type="submit" disabled={pending} className={submitClassName}>
          {pending ? "..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
