import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  adminSetBannedAction,
  adminSetRoleAction,
  adminDeleteUserAction,
  adminReviewReportAction,
  deleteTestimonialAction,
} from "@/app/actions";
import ActionButton from "@/app/components/ActionButton";
import Box from "@/app/components/Box";
import DeleteUserById from "@/app/components/DeleteUserById";
import DeleteUserByUsername from "@/app/components/DeleteUserByUsername";
import BulletinPostLimit from "@/app/components/BulletinPostLimit";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const db = getDb();

  const [userCount, friendCount, messageCount, testimonialCount, openReports] =
    await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("friendships").countDocuments({ status: "approved" }),
      db.collection("messages").countDocuments(),
      db.collection("testimonials").countDocuments(),
      db.collection("reports").countDocuments({ status: "open" }),
    ]);

  const userFilter: Record<string, unknown> = {};
  if (q && q.trim()) {
    const regex = q.trim();
    userFilter.$or = [
      { username: { $regex: regex, $options: "i" } },
      { displayName: { $regex: regex, $options: "i" } },
      { email: { $regex: regex, $options: "i" } },
    ];
  }
  const users = await db.collection("users").find(userFilter).sort({ createdAt: -1 }).limit(100).toArray();

  const bulletinSetting = await db.collection("settings").findOne({ key: "bulletin" });
  const bulletinPostLimit = (bulletinSetting?.maxBulletinPostsPerHour as number | null | undefined) ?? null;

  const reports = await db
    .collection("reports")
    .find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  const reportedIds = [...new Set(reports.map((r) => r.reportedId.toString()))];
  const reportedUsers =
    reportedIds.length > 0
      ? await db.collection("users").find({ _id: { $in: reportedIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];
  const reportedName = (id: string) =>
    reportedUsers.find((u) => u._id.toString() === id);

  const testimonials = await db
    .collection("testimonials")
    .find({ status: "pending" })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  const testiIds = [...new Set(testimonials.map((t) => t.profileId.toString()))];
  const testiProfiles =
    testiIds.length > 0
      ? await db.collection("users").find({ _id: { $in: testiIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];
  const testiProfile = (id: string) =>
    testiProfiles.find((u) => u._id.toString() === id);

  const stats = [
    ["Users", userCount],
    ["Friendships", friendCount],
    ["Messages", messageCount],
    ["Testimonials", testimonialCount],
    ["Open reports", openReports],
  ];

  return (
    <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🛡️ Admin Panel
      </div>
      <div className="p-4 flex flex-col gap-4">
        <Box title="Site Statistics">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.map(([label, n]) => (
              <div key={label} className="border border-[#6699cc] p-2 text-center bg-[#f5f9ff]">
                <div className="text-xl font-bold text-[#2c4d80]">{n}</div>
                <div className="text-[11px] text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Bulletin Post Limit">
          <p className="text-[12px] text-gray-600 mb-1.5">
            Maximum bulletin posts a user can make per hour. Leave blank or set 0 for no limit.
          </p>
          <BulletinPostLimit currentLimit={bulletinPostLimit} />
        </Box>

        <Box title="Delete User by Username">
          <p className="text-[12px] text-gray-600 mb-1.5">
            Enter a username to permanently delete the account and all related data
            (posts, comments, reactions, messages, friendships, chatboxes, reports, etc.).
          </p>
          <DeleteUserByUsername />
        </Box>

        <Box title="Delete User by ID">
          <p className="text-[12px] text-gray-600 mb-1.5">
            Paste a user&apos;s ID to permanently delete the account and all related data
            (posts, comments, reactions, messages, friendships, chatboxes, reports, etc.).
          </p>
          <DeleteUserById />
        </Box>

        <Box title={`Reports (${openReports} open)`}>
          {reports.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">No open reports.</p>
          ) : (
            reports.map((r) => {
              const reported = reportedName(r.reportedId.toString());
              return (
                <div key={r._id.toString()} className="border-b border-dotted border-[#99bbdd] py-1.5 last:border-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[12px]">
                      <b>
                        {reported ? (
                          <Link href={`/${reported.username}`} className="text-[#003399] no-underline">
                            {reported.displayName}
                          </Link>
                        ) : (
                          "(deleted user)"
                        )}
                      </b>{" "}
                      reported · {formatDate(r.createdAt)}
                      <div className="text-gray-500 italic">{r.reason}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <ActionButton
                        action={adminReviewReportAction.bind(null, r._id.toString(), "resolved")}
                        className="btn"
                      >
                        Resolve
                      </ActionButton>
                      <ActionButton
                        action={adminReviewReportAction.bind(null, r._id.toString(), "dismissed")}
                        className="btn btn-ghost"
                      >
                        Dismiss
                      </ActionButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </Box>

        <Box title={`Pending Testimonials (${testimonials.length})`}>
          {testimonials.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">Nothing pending.</p>
          ) : (
            testimonials.map((t) => (
              <div key={t._id.toString()} className="border-b border-dotted border-[#99bbdd] py-1.5 last:border-0">
                <div className="text-[12px]">
                  For{" "}
                  <b>
                    {testiProfile(t.profileId.toString()) ? (
                      <Link
                        href={`/${testiProfile(t.profileId.toString())!.username}`}
                        className="text-[#003399] no-underline"
                      >
                        {testiProfile(t.profileId.toString())!.displayName}
                      </Link>
                    ) : (
                      "(deleted)"
                    )}
                  </b>{" "}
                  · {timeAgo(t.createdAt)}
                  <p className="m-0 mt-0.5">{t.body}</p>
                </div>
                <div className="mt-1">
                  <ActionButton
                    action={deleteTestimonialAction.bind(null, t._id.toString())}
                    className="btn btn-danger"
                    confirmText="Delete this testimonial?"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))
          )}
        </Box>

        <Box title={`User Management (${users.length})`}>
          <form action="/admin" method="get" className="mb-2 flex gap-1.5">
            <input name="q" defaultValue={q || ""} placeholder="Search users…" className="input" />
            <button type="submit" className="btn">
              Search
            </button>
          </form>
          {users.length === 0 ? (
            <p className="text-gray-500 italic text-[12px]">No users found.</p>
          ) : (
            users.map((u) => (
              <div key={u._id.toString()} className="flex items-center justify-between gap-2 border-b border-dotted border-[#99bbdd] py-1.5 last:border-0 flex-wrap">
                <div className="text-[12px]">
                  <Link href={`/${u.username}`} className="text-[#003399] font-bold no-underline">
                    {u.displayName}
                  </Link>{" "}
                  <span className="text-gray-500">@{u.username}</span>
                  <span className={`ml-1 px-1 text-[10px] font-bold ${u.role === "admin" ? "bg-[#cc3399] text-white" : "bg-[#dbe9f7] text-[#2c4d80]"}`}>
                    {u.role}
                  </span>
                  {u.banned && (
                    <span className="ml-1 px-1 text-[10px] font-bold bg-red-600 text-white">BANNED</span>
                  )}
                  <div className="text-gray-500">{u.email} · joined {formatDate(u.createdAt)}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <ActionButton
                    action={adminSetBannedAction.bind(null, u._id.toString(), !u.banned)}
                    className={u.banned ? "btn" : "btn btn-danger"}
                  >
                    {u.banned ? "Unban" : "Ban"}
                  </ActionButton>
                  <ActionButton
                    action={adminSetRoleAction.bind(null, u._id.toString(), u.role === "admin" ? "user" : "admin")}
                    className="btn btn-ghost"
                  >
                    {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                  </ActionButton>
                  <ActionButton
                    action={adminDeleteUserAction.bind(null, u._id.toString())}
                    className="btn btn-danger"
                    confirmText={`Permanently delete ${u.displayName}? This cannot be undone.`}
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))
          )}
        </Box>
      </div>
    </div>
  );
}
