"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";

type ActionResult = { ok?: boolean; error?: string };

export default function HomeLoginForm() {
    const [state, formAction, pending] = useActionState(
        async (prev: ActionResult, formData: FormData) => {
            try {
                return await loginAction(prev, formData);
            } catch {
                return { error: "Something went wrong. Please try again." };
            }
        },
        { error: "" },
    );

    return (
        <div className="flex flex-col items-end gap-1">
            <form
                action={formAction}
                className="relative flex flex-wrap items-end gap-1.5"
            >
                <div className="w-44">
                    {/* <label
                    htmlFor="home-login-identifier"
                    className="block text-[10px] font-bold text-[#dbe9f7] mb-0.5"
                >
                    Username or Email
                </label> */}
                    <input
                        id="home-login-identifier"
                        name="identifier"
                        type="text"
                        required
                        autoComplete="username"
                        className="input h-8 bg-white"
                        placeholder="Username or email"
                    />
                </div>
                <div className="w-36">
                    {/* <label
                    htmlFor="home-login-password"
                    className="block text-[10px] font-bold text-[#dbe9f7] mb-0.5"
                >
                    Password
                </label> */}
                    <input
                        id="home-login-password"
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        className="input h-8 bg-white"
                        placeholder="Password"
                    />
                </div>
                <button
                    type="submit"
                    disabled={pending}
                    className="btn h-8 flex items-center justify-center"
                >
                    {pending ? "..." : "Login"}
                </button>
                {state.error && (
                    <div
                        className="absolute right-0 top-full mt-1 text-[11px] font-bold text-white bg-[#cc3333] px-1.5 py-0.5 whitespace-nowrap"
                        role="alert"
                    >
                        {state.error}
                    </div>
                )}
            </form>
            <Link
                href="/forgot-password"
                className="text-[11px] text-[#dbe9f7] underline"
            >
                Forgot password?
            </Link>
        </div>
    );
}
