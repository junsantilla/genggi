"use client";

import { useActionState, useEffect, useState } from "react";

type ActionResult = { ok?: boolean; error?: string };
type MathChallenge = { first: number; second: number };

export default function AuthForm({
  action,
  fields,
  submitLabel,
  mathChallenge = false,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields: { name: string; label: string; type: string }[];
  submitLabel: string;
  mathChallenge?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState<MathChallenge | null>(null);

  useEffect(() => {
    if (mathChallenge) {
      setChallenge({
        first: Math.floor(Math.random() * 9) + 1,
        second: Math.floor(Math.random() * 9) + 1,
      });
    }
  }, [mathChallenge]);
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
      {mathChallenge && challenge && (
        <div>
          <label htmlFor="mathAnswer" className="label">
            What is {challenge.first} + {challenge.second}?
          </label>
          <input
            id="mathAnswer"
            name="mathAnswer"
            type="number"
            value={values.mathAnswer ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, mathAnswer: event.target.value }))
            }
            className="input"
            required
            inputMode="numeric"
            min="0"
          />
          <input type="hidden" name="mathFirst" value={challenge.first} />
          <input type="hidden" name="mathSecond" value={challenge.second} />
        </div>
      )}
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
