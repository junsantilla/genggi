"use client";

import { useActionState, useState } from "react";
import { createChatboxAction } from "@/app/actions";

type ActionResult = { ok?: boolean; error?: string };

export default function CreateChatboxForm() {
  const [visibility, setVisibility] = useState("public");
  const [state, formAction, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      try {
        return await createChatboxAction(prev, formData);
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    { error: "" }
  );

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <div>
        <label htmlFor="chatbox-name" className="label">
          Chatbox Name
        </label>
        <input
          id="chatbox-name"
          name="name"
          type="text"
          placeholder="e.g. General Chat"
          maxLength={60}
          className="input"
          required
        />
      </div>
      <div>
        <label htmlFor="chatbox-visibility" className="label">
          Who can join?
        </label>
        <select
          id="chatbox-visibility"
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="input"
        >
          <option value="public">Public — anyone can join</option>
          <option value="friends">Friends only — only your friends can join</option>
        </select>
      </div>
      {state.error && (
        <div className="text-red-600 text-[11px] mt-1">{state.error}</div>
      )}
      {state.ok && (
        <div className="text-green-700 text-[12px] font-bold">
          Chatbox created!
        </div>
      )}
      <div>
        <button type="submit" disabled={pending} className="btn">
          {pending ? "..." : "Create Chatbox"}
        </button>
      </div>
    </form>
  );
}
