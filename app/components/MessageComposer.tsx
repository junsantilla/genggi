"use client";

import { useActionState, useEffect, useRef } from "react";

type ActionResult = { ok?: boolean; error?: string };

export default function MessageComposer({
    action,
    placeholder,
}: {
    action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
    placeholder: string;
}) {
    const [state, formAction, pending] = useActionState(action, { error: "" });
    const formRef = useRef<HTMLFormElement>(null);
    const previousOk = useRef(false);

    useEffect(() => {
        if (state.ok && !previousOk.current) {
            formRef.current?.reset();
        }
        previousOk.current = !!state.ok;
    }, [state.ok]);

    return (
        <div className="shrink-0 border-t border-[#c3d4e8] bg-white px-3 py-2.5">
            <form ref={formRef} action={formAction}>
                <textarea name="body" rows={2} placeholder={placeholder} className="input" required />
                {state.error && <div className="text-red-600 text-[11px] mt-1">{state.error}</div>}
                <div className="mt-1.5 flex justify-end">
                    <button type="submit" disabled={pending} className="btn">
                        {pending ? "..." : "Send"}
                    </button>
                </div>
            </form>
        </div>
    );
}
