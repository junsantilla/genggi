"use client";

import { useActionState, useState } from "react";

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
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      try {
        return await action(prev, formData);
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    { error: "" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="label">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={values[field.name] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.name]: event.target.value,
              }))
            }
            className="input"
            required
          />
        </div>
      ))}
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
        {pending ? "..." : submitLabel}
      </button>
    </form>
  );
}
