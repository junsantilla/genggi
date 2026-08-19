"use client";

import { useActionState } from "react";

type ActionResult = { ok?: boolean; error?: string };

export default function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields: { name: string; label: string; type: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="label">
            {f.label}
          </label>
          <input id={f.name} name={f.name} type={f.type} className="input" required />
        </div>
      ))}
      {state.error && (
        <div className="text-red-600 text-[11px] font-bold bg-red-50 border border-red-200 px-2 py-1">
          {state.error}
        </div>
      )}
      <button type="submit" disabled={pending} className="btn py-1.5 text-sm">
        {pending ? "..." : submitLabel}
      </button>
    </form>
  );
}
