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
        <div className={`${className}`}>
            <div className="box-title" style={{ background: border }}>
                {title}
            </div>
            <div className="">{children}</div>
        </div>
    );
}
