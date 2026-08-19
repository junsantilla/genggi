import Link from "next/link";

const FEATURES = [
  ["👥", "Friends", "Requests, Top 8, activity"],
  ["💬", "Messages", "Inbox & threads"],
  ["⭐", "Testimonials", "Write & approve"],
  ["🎨", "Customize", "Colors & profile"],
  ["👉", "Pokes", "Get their attention"],
];

export default function Landing() {
  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-4 py-6 text-center">
        <h1 className="font-['Comic_Sans_MS',cursive,sans-serif] text-3xl sm:text-4xl m-0 mb-1 tracking-tight">
          🤙 Welcome to genggeng<span className="text-[#ffde00]">.pro</span>
        </h1>
        <p className="text-[#dbe9f7] text-sm sm:text-base m-0">
          The nostalgic social network. Make a profile, add friends, send messages, and collect
          testimonials — just like the good old days.
        </p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {FEATURES.map(([icon, title, desc]) => (
            <div key={title} className="border border-[#6699cc] p-2.5 text-center bg-[#f5f9ff]">
              <div className="text-2xl">{icon}</div>
              <div className="font-bold text-[#2c4d80] text-[12px]">{title}</div>
              <div className="text-gray-500 text-[10px]">{desc}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href="/signup"
            className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white font-bold text-sm px-6 py-2.5 text-center no-underline border border-[#2c4d80]"
          >
            Create Your Account
          </Link>
          <Link
            href="/login"
            className="bg-[#dbe9f7] text-[#003399] font-bold text-sm px-6 py-2.5 text-center no-underline border border-[#6699cc]"
          >
            Login
          </Link>
        </div>

        <p className="text-center text-gray-500 text-[10px] mt-6">
          genggeng.pro — made for nostalgic fun.
        </p>
      </div>
    </div>
  );
}
