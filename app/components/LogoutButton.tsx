"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions";

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-[#003399] font-bold no-underline hover:underline py-0.5 cursor-pointer bg-transparent border-0 text-[12px] sm:text-[13px]"
      onClick={() => startTransition(() => logoutAction())}
    >
      {pending ? "..." : "Logout"}
    </button>
  );
}
