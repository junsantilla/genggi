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
        <div className={`box ${className}`} style={{ borderColor: border }}>
            <div className="box-title" style={{ background: border }}>
                {title}
            </div>
            <div className="box-content" style={{ background: bg }}>
                {children}
            </div>
        </div>
    );
}
