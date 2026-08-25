"use client";

import { useState } from "react";
import { deleteGroupAction } from "@/app/actions";

export default function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn text-[11px] text-[#cc0000]"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm("Delete this group permanently? This cannot be undone.")) return;
        setPending(true);
        await deleteGroupAction(groupId);
      }}
    >
      {pending ? "Deleting..." : "Delete group"}
    </button>
  );
}
