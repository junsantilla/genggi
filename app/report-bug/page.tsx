import { getCurrentUser } from "@/lib/auth";
import { getDb, ObjectId } from "@/lib/db";
import Box from "@/app/components/Box";
import BoundForm from "@/app/components/BoundForm";
import BugReportList from "@/app/components/BugReportList";
import { reportBugAction } from "@/app/actions";

export default async function ReportBugPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.username === "genggengpro";

  let reports: { _id: ObjectId; userId?: ObjectId | null; body: string; createdAt: Date; done: boolean }[] = [];
  if (isAdmin) {
    const db = getDb();
    reports = (await db
      .collection("bugReports")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()) as typeof reports;
  }

  return (
    <div className="max-w-[640px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x">
      <div className="bg-gradient-to-b from-[#4a76b8] to-[#2c4d80] text-white px-2.5 py-1.5 font-bold text-xl text-center tracking-tight">
        🐛 Report a Bug
      </div>
      <div className="p-4">
        <Box title="Found a bug?">
          <p className="text-[12px] text-gray-600 mb-3">
            Describe the bug below and we&apos;ll look into it. Include what
            page you were on and what you expected to happen.
          </p>
          <BoundForm
            action={reportBugAction}
            submitLabel="Submit Bug Report"
            textarea
            name="body"
            placeholder="e.g. On the messages page, clicking send doesn't do anything..."
            rows={6}
            successMessage="Thanks! Your bug report has been sent."
          />
        </Box>

        {isAdmin && reports.length > 0 && (
          <Box title={`Bug Reports (${reports.length})`}>
            <BugReportList
              reports={reports.map((r) => ({
                _id: r._id.toString(),
                userId: r.userId?.toString() ?? null,
                body: r.body,
                createdAt: r.createdAt,
                done: !!r.done,
              }))}
            />
          </Box>
        )}
      </div>
    </div>
  );
}
