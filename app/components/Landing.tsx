import Link from "next/link";
import { signupAction } from "@/app/actions";
import AuthForm from "./AuthForm";
import Box from "./Box";
import HomeLoginForm from "./HomeLoginForm";

const FEATURES = [
    ["👥", "Friends", "Requests, Featured Friends"],
    ["💬", "Messages", "Inbox & threads"],
    ["⭐", "Testimonials", "Write & approve"],
    ["🎨", "Customize", "Colors & profile"],
    ["", "Pokes", "Get their attention"],
    ["", "Bulletin Board", "Public posts & friends"],
];

export default function Landing({ border = "#6699cc" }: { border?: string }) {
    return (
        <div className="landing-page min-h-[calc(100dvh-66px)] flex flex-col">
            {/* Header: full-width bar flush to top, logo on the left, login form on the right */}
            <header className="sticky top-0 z-50 bg-[#2C4D80] text-white border-b border-[#6699cc]">
                <div className="max-w-[960px] w-full mx-auto flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
                    <Link
                        href="/"
                        className="no-underline text-white flex items-center gap-1.5 shrink-0"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/genggeng-logo4.png"
                            alt="genggeng"
                            className="h-10 w-10 object-cover rounded"
                        />
                        <span className="font-bold text-xl sm:text-xl tracking-tight">
                            genggi
                        </span>
                    </Link>
                    <HomeLoginForm />
                </div>
            </header>

            {/* Main: welcome + features on the left, sign up on the right, vertically centered */}
            <div className="flex-1 flex items-center py-2">
                <div className="max-w-[960px] w-full mx-auto">
                    <div className="flex flex-wrap w-full items-center">
                        <div className="w-full sm:w-3/5 p-2.5 sm:pr-[5px]">
                            <div className="p-2.5 mb-2.5 mr-10">
                                <h1 className="text-2xl font-bold sm:text-4xl m-0 mb-1 tracking-tight text-[#2c4d80]">
                                    Your social profile
                                </h1>
                                <p className="text-lg leading-relaxed text-gray-700 m-0">
                                    Create a profile that feels like you.
                                    Customize your space, express your identity,
                                    and connect with people your way.
                                </p>
                            </div>
                        </div>

                        {/* Sign up form */}
                        <div className="w-full sm:w-2/5 p-2.5 sm:pl-[5px]">
                            <Box
                                title="Create your account"
                                border={border}
                                bg="#f5f9ff"
                            >
                                <AuthForm
                                    action={signupAction}
                                    fields={[
                                        {
                                            name: "username",
                                            label: "Username (3-20 chars, lowercase)",
                                            type: "text",
                                        },
                                        {
                                            name: "displayName",
                                            label: "Display Name",
                                            type: "text",
                                        },
                                        {
                                            name: "email",
                                            label: "Email",
                                            type: "email",
                                        },
                                        {
                                            name: "password",
                                            label: "Password (min 6 chars)",
                                            type: "password",
                                        },
                                        {
                                            name: "confirm",
                                            label: "Confirm Password",
                                            type: "password",
                                        },
                                    ]}
                                    submitLabel="Create Account"
                                    mathChallenge
                                />
                                {/* <p className="text-center text-[12px] text-gray-500 mt-3">
                                    Already have an account?{" "}
                                    <Link
                                        href="/login"
                                        className="text-[#003399] font-bold"
                                    >
                                        Login
                                    </Link>
                                </p> */}
                            </Box>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
