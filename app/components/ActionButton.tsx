"use client";

import { useTransition, useState } from "react";

type ActionResult = { ok?: boolean; error?: string };

export default function ActionButton({
  action,
  children,
  className = "btn",
  confirmText,
  disabled,
  onSuccess,
  hideError = false,
}: {
  action: () => Promise<ActionResult | void>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  hideError?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <span className="inline-block">
      <button
        type="button"
        disabled={pending || disabled}
        className={className}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setError("");
          startTransition(async () => {
            const res = await action();
            if (res && "error" in res && res.error) setError(res.error);
            else onSuccess?.();
          });
        }}
      >
        {pending ? "..." : children}
      </button>
      {error && !hideError && <span className="block text-red-600 text-[11px] mt-0.5">{error}</span>}
    </span>
  );
}
