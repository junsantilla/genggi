import MasonryBackground from "./MasonryBackground";

export default function AuthPageShell({
    title,
    children,
    showTitle = true,
}: {
    title?: string;
    children: React.ReactNode;
    showTitle?: boolean;
}) {
    return (
        <div className="auth-page relative flex h-[calc(100dvh-53px)] flex-1 flex-col items-center justify-center overflow-hidden px-2.5 py-8 sm:py-12">
            <MasonryBackground />

            <div className="relative z-10 flex max-h-screen flex-1 flex-col  w-full max-w-[440px] items-center justify-center overflow-hidden px-2.5 py-8 sm:py-12">
                <div className="auth-card mx-auto w-full max-w-[440px] border border-[#6699cc] bg-white shadow-lg">
                    {showTitle && title && (
                        <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] px-2.5 py-2 text-center text-xl font-bold tracking-tight text-white">
                            {title}
                        </div>
                    )}

                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}
