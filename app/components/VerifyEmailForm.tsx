"use client";

import { useEffect, useTransition, useState } from "react";
import Link from "next/link";
import { verifyEmailAction } from "@/app/actions";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    startTransition(async () => {
      const res = await verifyEmailAction(token);
      if (res && "error" in res && res.error) setError(res.error);
    });
  }, [token]);

  if (pending) {
    return (
      <p className="text-[12px] text-gray-600" role="status">
        Verifying your email...
      </p>
    );
  }

  if (error) {
    return (
      <div>
        <div
          className="text-red-600 text-[12px] font-bold bg-red-50 border border-red-200 px-2 py-2"
          role="alert"
        >
          {error}
        </div>
        <p className="text-[12px] text-gray-600 mt-3">
          You can request a new confirmation link below, or{" "}
          <Link href="/login" className="text-[#003399] font-bold">
            go to login
          </Link>
          .
        </p>
      </div>
    );
  }

  return null;
}
