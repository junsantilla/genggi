import Link from "next/link";
import { getDb, ObjectId } from "@/lib/db";
import { getProfileBulletinPosts } from "@/lib/bulletin";
import type { User } from "@/lib/types";
import { getFriendshipStatus, isBlocked, areFriends } from "@/lib/queries";
import { timeAgo, padViews, initials } from "@/lib/utils";
import {
    sendFriendRequestAction,
    respondFriendRequestAction,
    pokeAction,
    blockUserAction,
    unblockUserAction,
    approveTestimonialAction,
    deleteTestimonialAction,
    writeTestimonialAction,
    reportUserAction,
} from "@/app/actions";
import ActionButton from "./ActionButton";
import BoundForm from "./BoundForm";
import Box from "./Box";
import BulletinBoard from "./BulletinBoard";

export default async function Profile({
    user,
    currentUser,
}: {
    user: User;
    currentUser: User | null;
}) {
    const db = getDb();
    const uid = user._id.toString();
    const me = currentUser?._id.toString();
    const isOwner = !!me && me === uid;

    const [friendshipStatus, blockedByProfile, iBlockedThem, isFriend] =
        await Promise.all([
            me
                ? getFriendshipStatus(me, uid)
                : Promise.resolve("none" as const),
            me ? isBlocked(uid, me) : Promise.resolve(false),
            me ? isBlocked(me, uid) : Promise.resolve(false),
            me ? areFriends(me, uid) : Promise.resolve(false),
        ]);

    const theme = user.theme || { bgTint: "#eef3fb", border: "#6699cc" };
    const customCss = user.theme?.customCss?.trim();
    const safeCustomCss = customCss?.replace(/<\/style/gi, "<\\/style");
    const canView = isOwner || !user.isPrivate || isFriend;
    const bulletinPosts = canView
        ? await getProfileBulletinPosts(uid, isOwner, isFriend)
        : [];

    // Six most recent friends
    const friendDocs = await db
        .collection("friendships")
        .find({
            status: "approved",
            $or: [{ requesterId: user._id }, { addresseeId: user._id }],
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
    const friendIds = friendDocs.map((f) =>
        f.requesterId.toString() === uid ? f.addresseeId : f.requesterId,
    );
    const topFriends =
        friendIds.length > 0
            ? await db
                  .collection("users")
                  .find({ _id: { $in: friendIds } })
                  .toArray()
            : [];

    // Testimonials
    const testimonials = await db
        .collection("testimonials")
        .find({ profileId: user._id, status: "approved" })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
    const pendingTestimonials = isOwner
        ? await db
              .collection("testimonials")
              .find({ profileId: user._id, status: "pending" })
              .sort({ createdAt: -1 })
              .toArray()
        : [];

    const testiAuthorIds = [...testimonials, ...pendingTestimonials].map(
        (t) => t.authorId,
    );
    const testiAuthors =
        testiAuthorIds.length > 0
            ? await db
                  .collection("users")
                  .find({ _id: { $in: testiAuthorIds } })
                  .toArray()
            : [];
    const authorName = (id: ObjectId) =>
        testiAuthors.find((a) => a._id.toString() === id.toString())
            ?.displayName || "Someone";

    const brief: [string, string][] = [
        ["Status:", user.relationshipStatus || "—"],
        ["Here for:", "Friends, Dating, Networking"],
        ["Orientation:", user.orientation || "—"],
        ["Hometown:", user.location || "—"],
        ["Body type:", user.bodyType || "—"],
        ["Zodiac:", user.zodiac || "—"],
        ["Occupation:", user.occupation || "—"],
        ["Gender:", user.gender || "—"],
        ["Last active:", timeAgo(user.lastActive)],
    ];

    if (blockedByProfile) {
        return (
            <div className="max-w-[960px] w-full mx-auto bg-white border border-[#6699cc] sm:border-x p-6 text-center text-[13px]">
                <p className="font-bold text-[#cc3399] text-lg mb-1">
                    {user.displayName} has blocked you.
                </p>
                <p className="text-gray-500">
                    You can&apos;t view this profile or interact with this user.
                </p>
            </div>
        );
    }

    return (
        <div className="profile-page w-full">
            {safeCustomCss && (
                <style dangerouslySetInnerHTML={{ __html: safeCustomCss }} />
            )}
            <div
                id="wrap"
                className="profile-content max-w-[960px] w-full mx-auto bg-white border sm:border-x"
                style={{ borderColor: theme.border }}
            >
                {!canView ? (
                    <div className="p-6 text-center">
                        <p className="font-bold text-[#2c4d80] text-lg mb-1">
                            🔒 This profile is private
                        </p>
                        <p className="text-gray-500 text-[13px]">
                            {user.displayName} only shares their profile with
                            friends. Add them as a friend to view it.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-wrap w-full">
                        {/* ---------------- Left column ---------------- */}
                        <div className="profile-main-column w-full sm:w-3/4 p-2.5 pb-0 sm:pb-2.5">
                            <Box
                                title={`${user.displayName} (@${user.username})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-intro"
                            >
                                <div className="flex flex-wrap">
                                    {/* Left: photo, name, username, buttons */}
                                    <div className="w-full sm:w-[220px] sm:shrink-0 sm:pr-2.5">
                                        {user.photo ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={user.photo}
                                                alt={`${user.displayName}'s photo`}
                                                className="profile-photo w-full max-w-[260px] sm:max-w-none sm:w-[200px] h-[220px] object-cover border mx-auto mb-2"
                                                style={{
                                                    borderColor: theme.border,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="profile-photo pic-bg w-full max-w-[260px] sm:max-w-none sm:w-[200px] h-[220px] border flex items-center justify-center text-[#4a76b8] italic text-[12px] mx-auto mb-2"
                                                style={{
                                                    borderColor: theme.border,
                                                }}
                                            >
                                                {initials(user.displayName)}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {!isOwner && me && (
                                            <div className="profile-actions flex flex-col gap-1 max-w-[260px] sm:max-w-none sm:w-[200px] mx-auto mb-2.5">
                                                {friendshipStatus ===
                                                    "none" && (
                                                    <ActionButton
                                                        action={sendFriendRequestAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn w-full"
                                                    >
                                                        + Add as Friend
                                                    </ActionButton>
                                                )}
                                                {friendshipStatus ===
                                                    "pending_out" && (
                                                    <span className="btn w-full text-center opacity-70 cursor-default">
                                                        ⏳ Request Pending
                                                    </span>
                                                )}
                                                {friendshipStatus ===
                                                    "pending_in" && (
                                                    <>
                                                        <ActionButton
                                                            action={respondFriendRequestAction.bind(
                                                                null,
                                                                uid,
                                                                true,
                                                            )}
                                                            className="btn w-full"
                                                        >
                                                            ✓ Accept Request
                                                        </ActionButton>
                                                    </>
                                                )}
                                                {friendshipStatus ===
                                                    "friends" && (
                                                    <span className="btn w-full text-center opacity-80 cursor-default">
                                                        ✓ Friends{" "}
                                                        <Link
                                                            href="/friends"
                                                            className="text-white underline"
                                                        >
                                                            (manage)
                                                        </Link>
                                                    </span>
                                                )}
                                                <Link
                                                    href={`/messages?to=${user.username}`}
                                                    className="btn w-full text-center no-underline"
                                                >
                                                    Send Message
                                                </Link>
                                                <ActionButton
                                                    action={pokeAction.bind(
                                                        null,
                                                        uid,
                                                    )}
                                                    className="btn w-full"
                                                >
                                                    👉 Poke
                                                </ActionButton>
                                                {iBlockedThem ? (
                                                    <ActionButton
                                                        action={unblockUserAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn w-full"
                                                    >
                                                        Unblock
                                                    </ActionButton>
                                                ) : (
                                                    <ActionButton
                                                        action={blockUserAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn w-full"
                                                        confirmText="Block this user? They won't be able to interact with you."
                                                    >
                                                        Block User
                                                    </ActionButton>
                                                )}
                                                <details className="w-full">
                                                    <summary className="btn w-full text-center cursor-pointer list-none">
                                                        🚩 Report
                                                    </summary>
                                                    <div className="mt-1">
                                                        <BoundForm
                                                            action={reportUserAction.bind(
                                                                null,
                                                                uid,
                                                            )}
                                                            submitLabel="Submit Report"
                                                            textarea
                                                            name="reason"
                                                            placeholder="Reason for reporting this user"
                                                            rows={2}
                                                        />
                                                    </div>
                                                </details>
                                            </div>
                                        )}

                                        {isOwner && (
                                            <div className="profile-actions max-w-[260px] sm:max-w-none sm:w-[200px] mx-auto mb-2.5">
                                                <Link
                                                    href="/edit"
                                                    className="btn w-full text-center no-underline block"
                                                >
                                                    ✏️ Edit Profile
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: brief table */}
                                    <div className="profile-details w-full sm:flex-1 sm:min-w-0">
                                        <table className="w-full">
                                            <tbody>
                                                {brief.map(([k, v]) => (
                                                    <tr key={k}>
                                                        <td className="p-0.5 px-1 align-top font-bold text-[#2c4d80] w-[90px]">
                                                            {k}
                                                        </td>
                                                        <td className="p-0.5 px-1 align-top">
                                                            {v}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </Box>

                            <Box
                                title="Profile Views"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-views"
                            >
                                <div className="text-center">
                                    <span className="bg-black text-[#0f0] font-mono text-[12px] px-1.5 py-0.5 inline-block border border-[#333]">
                                        {padViews(user.profileViews)}
                                    </span>
                                </div>
                            </Box>

                            <Box
                                title="My Interests"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-interests"
                            >
                                {user.interests.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {user.interests.map((i) => (
                                            <span
                                                key={i}
                                                className="bg-[#dbe9f7] border border-[#6699cc] px-1.5 py-0.5 text-[11px] rounded"
                                            >
                                                {i}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-500 italic text-[12px]">
                                        No interests added yet.
                                    </span>
                                )}
                            </Box>

                            <Box
                                title="Music"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-music"
                            >
                                {user.favoriteSong ? (
                                    <p className="text-[12px]">
                                        <b>Favorite song:</b> “
                                        {user.favoriteSong}”
                                    </p>
                                ) : (
                                    <span className="text-gray-500 italic text-[12px]">
                                        No favorite song set.
                                    </span>
                                )}
                            </Box>

                            <Box
                                title="About Me"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-about"
                            >
                                {user.aboutMe ? (
                                    <p className="whitespace-pre-wrap">
                                        {user.aboutMe}
                                    </p>
                                ) : (
                                    <span className="text-gray-500 italic text-[12px]">
                                        Hey everyone!! welcome to my profile
                                        lol. (edit your About Me!)
                                    </span>
                                )}
                            </Box>

                            <Box
                                title="Who I'd Like to Meet"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-meet"
                            >
                                {user.whoIdLikeToMeet ? (
                                    <p className="whitespace-pre-wrap">
                                        {user.whoIdLikeToMeet}
                                    </p>
                                ) : (
                                    <span className="text-gray-500 italic text-[12px]">
                                        People who don&apos;t take life too
                                        seriously.
                                    </span>
                                )}
                            </Box>

                            <BulletinBoard
                                posts={bulletinPosts}
                                currentUserId={me}
                                title={`Bulletin Board`}
                            />

                            {/* Testimonials */}
                            <Box
                                title={`Testimonials (${testimonials.length})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-testimonials"
                            >
                                {pendingTestimonials.length > 0 && (
                                    <div className="mb-2 border border-dashed border-[#cc99cc] p-1.5">
                                        <p className="font-bold text-[11px] text-[#cc3399] mb-1">
                                            Pending approval (
                                            {pendingTestimonials.length})
                                        </p>
                                        {pendingTestimonials.map((t) => (
                                            <div
                                                key={t._id.toString()}
                                                className="border-b border-dotted border-[#99bbdd] py-1"
                                            >
                                                <span className="text-[#cc3399] font-bold">
                                                    {authorName(t.authorId)}
                                                </span>{" "}
                                                <span className="text-gray-500 text-[11px]">
                                                    {timeAgo(t.createdAt)}
                                                </span>
                                                <br />
                                                {t.body}
                                                <div className="mt-1 flex gap-1.5">
                                                    <ActionButton
                                                        action={approveTestimonialAction.bind(
                                                            null,
                                                            t._id.toString(),
                                                        )}
                                                        className="btn"
                                                    >
                                                        Approve
                                                    </ActionButton>
                                                    <ActionButton
                                                        action={deleteTestimonialAction.bind(
                                                            null,
                                                            t._id.toString(),
                                                        )}
                                                        className="btn btn-danger"
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {testimonials.length === 0 &&
                                pendingTestimonials.length === 0 ? (
                                    <span className="text-gray-500 italic text-[12px]">
                                        No testimonials yet.
                                    </span>
                                ) : (
                                    testimonials.map((t) => (
                                        <div
                                            key={t._id.toString()}
                                            className="border-b border-dotted border-[#99bbdd] py-1.5 last:border-0"
                                        >
                                            <span className="text-[#cc3399] font-bold">
                                                {authorName(t.authorId)}
                                            </span>{" "}
                                            <span className="text-gray-500 text-[11px]">
                                                wrote {timeAgo(t.createdAt)}
                                            </span>
                                            <br />
                                            {t.body}
                                            {isOwner && (
                                                <div className="mt-1">
                                                    <ActionButton
                                                        action={deleteTestimonialAction.bind(
                                                            null,
                                                            t._id.toString(),
                                                        )}
                                                        className="btn btn-danger"
                                                    >
                                                        Delete
                                                    </ActionButton>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}

                                {!isOwner && me && (
                                    <div className="mt-2 border-t border-[#99bbdd] pt-2">
                                        <p className="font-bold text-[11px] text-[#2c4d80] mb-1">
                                            Leave a testimonial:
                                        </p>
                                        <BoundForm
                                            action={writeTestimonialAction.bind(
                                                null,
                                                uid,
                                            )}
                                            submitLabel="Post Testimonial"
                                            textarea
                                            name="body"
                                            placeholder="Say something nice!"
                                            rows={2}
                                        />
                                    </div>
                                )}
                            </Box>
                        </div>

                        {/* ---------------- Right column ---------------- */}
                        <div className="profile-sidebar w-full sm:w-1/4 p-2.5 pt-0 sm:pt-2.5">
                            {/* Six most recent friends */}
                            <Box
                                title={`${user.displayName.split(" ")[0]}'s Friends (recent ${topFriends.length})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-friends"
                            >
                                {topFriends.length === 0 ? (
                                    <span className="text-gray-500 italic text-[12px]">
                                        No friends yet.
                                    </span>
                                ) : (
                                    <>
                                        <div className="profile-friends-grid grid grid-cols-2 min-[361px]:grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                            {topFriends.map((f) => (
                                                <div
                                                    key={f._id.toString()}
                                                    className="profile-friend-card min-w-0 text-center text-[11px]"
                                                >
                                                    <Link
                                                        href={`/u/${f.username}`}
                                                        className="block"
                                                    >
                                                        {f.photo ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={f.photo}
                                                                alt={
                                                                    f.displayName
                                                                }
                                                                className="profile-friend-photo w-[60px] h-[60px] object-cover border border-[#cc99cc] mx-auto mb-0.5"
                                                            />
                                                        ) : (
                                                            <div className="profile-friend-photo friend-thumb-bg w-[60px] h-[60px] border border-[#cc99cc] mx-auto mb-0.5"></div>
                                                        )}
                                                    </Link>
                                                    <Link
                                                        href={`/u/${f.username}`}
                                                        className="text-[#003399] no-underline font-bold"
                                                    >
                                                        {f.displayName}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                        {isOwner && (
                                            <div className="text-right mt-1.5">
                                                <Link
                                                    href="/friends"
                                                    className="text-[#003399]"
                                                >
                                                    View All Friends »
                                                </Link>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Box>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div
                    className="profile-footer text-center text-[11px] text-[#6699cc] p-2 border-t"
                    style={{
                        background: theme.bgTint,
                        borderColor: theme.border,
                    }}
                >
                    genggeng.pro — made for nostalgic fun. · @{user.username}{" "}
                    joined {timeAgo(user.createdAt)}
                </div>
            </div>
        </div>
    );
}
