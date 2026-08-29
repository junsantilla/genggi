import type { ReactNode } from "react";

export default function InfoPage({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="max-w-[760px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
            <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
                {title}
            </div>
            <article className="p-4 space-y-4 [&_h2]:text-[#2c4d80] [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-5 [&_h2]:mb-1 [&_p]:text-gray-700 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:text-gray-700 [&_li]:leading-relaxed [&_a]:text-[#003399] [&_a]:underline">
                {children}
            </article>
        </div>
    );
}
