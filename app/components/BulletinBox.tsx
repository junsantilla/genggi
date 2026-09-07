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
        <div className={`box mb-3 ${className}`}>
            <div
                className="box-title text-white font-bold px-3 py-1 text-[13px]"
                style={{ background: border }}
            >
                {title}
            </div>
            <div className="">{children}</div>
        </div>
    );
}
