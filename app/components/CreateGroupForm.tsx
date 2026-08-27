"use client";

import { useActionState } from "react";
import { createGroupAction } from "@/app/actions";

type State = { ok?: boolean; error?: string };

export default function CreateGroupForm() {
    const [state, action, pending] = useActionState(
        async (_: State, formData: FormData) => createGroupAction(formData),
        { error: "" },
    );
    return (
        <form action={action} className="flex flex-col gap-2">
            <input
                name="name"
                className="input"
                placeholder="Group name"
                maxLength={80}
                required
            />
            <input name="photo" type="file" accept="image/*" className="" />
            <select name="privacy" className="input" defaultValue="public">
                <option value="public">Public — everyone can see posts</option>
                <option value="private">
                    Private — members only; requests require approval
                </option>
            </select>
            {state.error && (
                <p className="text-red-600 text-[11px]">{state.error}</p>
            )}
            {state.ok && (
                <p className="text-green-700 text-[11px] font-bold">
                    Group created!
                </p>
            )}
            <button className="btn self-start" disabled={pending}>
                {pending ? "Creating..." : "Create group"}
            </button>
        </form>
    );
}
