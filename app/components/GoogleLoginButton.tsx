"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase";

type Props = { onError?: (message: string) => void };

export default function GoogleLoginButton({ onError }: Props) {
    const [pending, setPending] = useState(false);
    const router = useRouter();

    async function handleClick() {
        setPending(true);
        onError?.("");
        try {
            const result = await signInWithGoogle();
            const idToken = await result.user.getIdToken();
            const response = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            });
            const data = (await response.json()) as { error?: string };
            if (!response.ok)
                throw new Error(data.error || "Google login failed.");
            router.push("/");
            router.refresh();
        } catch (error) {
            onError?.(
                error instanceof Error ? error.message : "Google login failed.",
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className="btn w-full py-1.5 text-sm"
        >
            {pending ? (
                "Signing in..."
            ) : (
                <span className="inline-flex items-center justify-center gap-2">
                    {/* <Image
                        src="/images/google-logo.svg"
                        alt=""
                        width={18}
                        height={18}
                        aria-hidden="true"
                    /> */}
                    Continue with Google
                </span>
            )}
        </button>
    );
}
