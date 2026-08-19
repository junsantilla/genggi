"use client";

import { useState } from "react";

export default function FriendSearch({
  friends,
}: {
  friends: { username: string; displayName: string }[];
}) {
  const [q, setQ] = useState("");
  const filtered = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(q.toLowerCase()) ||
      f.username.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="text-[11px]">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your friends…"
        className="input"
      />
      {q && (
        <p className="text-gray-500 mt-1">
          {filtered.length} match{filtered.length === 1 ? "" : "es"} “{q}”
        </p>
      )}
    </div>
  );
}
