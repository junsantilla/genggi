"use client";

import { useTransition, useState } from "react";
import { adminDeleteUserByIdAction } from "@/app/actions";

export default function DeleteUserById() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [value, setValue] = useState("");

  return (
    <div>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="Paste user ID…"
          className="input flex-1"
        />
        <button
          type="button"
          disabled={pending || !value.trim()}
          className="btn btn-danger"
          onClick={() => {
            const id = value.trim();
            if (!window.confirm(`Permanently delete the user with ID ${id} and ALL of their data? This cannot be undone.`))
              return;
            setError("");
            setSuccess("");
            startTransition(async () => {
              const res = await adminDeleteUserByIdAction(id);
              if (res && "error" in res && res.error) {
                setError(res.error);
              } else {
                setSuccess("User and all related data deleted.");
                setValue("");
              }
            });
          }}
        >
          {pending ? "..." : "Delete User"}
        </button>
      </div>
      {error && <p className="text-red-600 text-[11px] mt-1">{error}</p>}
      {success && <p className="text-green-600 text-[11px] mt-1">{success}</p>}
    </div>
  );
}
