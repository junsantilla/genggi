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
        <div className="auth-page relative flex min-h-[calc(100dvh-53px)] flex-1 flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-2.5 py-6 sm:justify-center sm:py-12">
            <MasonryBackground />

            <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center justify-start px-2.5 py-2 sm:flex-1 sm:justify-center sm:py-8">
                <div className="auth-card mx-auto w-full max-w-[440px] border border-[#6699cc] bg-white shadow-lg">
                    {showTitle && title && (
                        <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] px-2.5 py-2 text-center text-xl font-bold tracking-tight text-white">
                            {title}
                        </div>
                    )}

                    <div className="p-3 sm:p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}
