"use client";

import { useState } from "react";

import { timeAgo } from "@/lib/utils";
import {
  toggleBugReportDoneAction,
  deleteBugReportAction,
} from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";

export default function BugReportList({
  reports,
}: {
  reports: { _id: string; userId?: string | null; body: string; createdAt: Date; done: boolean }[];
}) {
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(reports.map((r) => [r._id, r.done]))
  );

  const toggle = (id: string) => {
    setDone((d) => ({ ...d, [id]: !d[id] }));
    toggleBugReportDoneAction(id);
  };

  return (
    <div>
      {reports.map((r) => (
        <div
          key={r._id}
          className="border-b border-dotted border-[#99bbdd] py-2 last:border-0 flex gap-2 items-start"
        >
          <input
            type="checkbox"
            checked={!!done[r._id]}
            onChange={() => toggle(r._id)}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1">
            <p
              className={`text-[12px] ${done[r._id] ? "line-through text-gray-400" : ""}`}
            >
              {r.body}
            </p>
            <div className="text-gray-500 text-[11px] mt-1">
              {r.userId ? `User ID: ${r.userId}` : "Anonymous"} ·{" "}
              {timeAgo(r.createdAt)}
            </div>
          </div>
          <ActionButton
            action={() => deleteBugReportAction(r._id)}
            className="btn btn-danger"
            confirmText="Delete this bug report?"
          >
            Delete
          </ActionButton>
        </div>
      ))}
    </div>
  );
}
