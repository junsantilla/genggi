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
    <div className={`border mb-3 ${className}`} style={{ borderColor: border }}>
      <div
        className="text-white font-bold px-1.5 py-0.5 text-xs"
        style={{ background: border }}
      >
        {title}
      </div>
      <div className="p-1.5 px-2" style={{ background: bg }}>
        {children}
      </div>
    </div>
  );
}
