export default function BulletinBox({
    title,
    children,
    border = "#6699cc",
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
            className={`box border-0 sm:border sm:border-secondary mb-3 ${className}`}
        >
            <div
                className="box-title text-white font-bold px-1.5 py-0.5 text-[13px]"
                style={{ background: border }}
            >
                {title}
            </div>
            <div className="box-content p-1.5 px-0 sm:px-2">{children}</div>
        </div>
    );
}
