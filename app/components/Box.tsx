export default function Box({
    title,
    children,
    border = "#6699cc",
    bg = "#f5f9ff",
    className = "",
}: {
    title: string;
    children: React.ReactNode;
    border?: string;
    bg?: string;
    className?: string;
}) {
    return (
        <div
            className={`box border mb-3 ${className}`}
            style={{ borderColor: border }}
        >
            <div className="box-title bg-background text-white font-bold p-2.5 py-1.5 text-[13px]">
                {title}
            </div>
            <div className="box-content p-1.5 px-2" style={{ background: bg }}>
                {children}
            </div>
        </div>
    );
}
