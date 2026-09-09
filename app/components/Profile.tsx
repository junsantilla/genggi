import type { CSSProperties } from "react";
import Link from "next/link";
import { getDb, ObjectId } from "@/lib/db";
import { getProfileBulletinPosts } from "@/lib/bulletin";
import { getProfileVids } from "@/lib/vids";
import type { User } from "@/lib/types";
import {
    getFriendshipStatus,
    getFriendSuggestions,
    isBlocked,
    areFriends,
} from "@/lib/queries";
import { timeAgo, padViews } from "@/lib/utils";
import {
    sendFriendRequestAction,
    cancelFriendRequestAction,
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
import YouTubeMusicPlayer from "./YouTubeMusicPlayer";
import UserAvatar from "./UserAvatar";
import ProfileVids from "./ProfileVids";
import { displayNameOrUsername } from "@/lib/utils";

export default async function Profile({
    user,
    currentUser,
    customCssEnabled = true,
}: {
    user: User;
    currentUser: User | null;
    customCssEnabled?: boolean;
}) {
    const db = getDb();
    const uid = user._id.toString();
    const me = currentUser?._id.toString();
    const isOwner = !!me && me === uid;

    const [
        friendshipStatus,
        blockedByProfile,
        iBlockedThem,
        isFriend,
        incomingRequest,
        outgoingRequest,
    ] = await Promise.all([
        me ? getFriendshipStatus(me, uid) : Promise.resolve("none" as const),
        me ? isBlocked(uid, me) : Promise.resolve(false),
        me ? isBlocked(me, uid) : Promise.resolve(false),
        me ? areFriends(me, uid) : Promise.resolve(false),
        me
            ? db.collection("friendships").findOne({
                  requesterId: user._id,
                  addresseeId: currentUser!._id,
                  status: "pending",
              })
            : Promise.resolve(null),
        me
            ? db.collection("friendships").findOne({
                  requesterId: currentUser!._id,
                  addresseeId: user._id,
                  status: "pending",
              })
            : Promise.resolve(null),
    ]);

    const theme = user.theme || { border: "#6699cc" };
    const customCss = customCssEnabled
        ? user.theme?.customCss?.trim()
        : undefined;
    const safeCustomCss = customCss?.replace(/<\/style/gi, "<\\/style");
    const canView = isOwner || !user.isPrivate || isFriend;
    const [bulletinPosts, friendSuggestions, profileVids] = canView
        ? await Promise.all([
              getProfileBulletinPosts(uid, isOwner, isFriend, me ?? null),
              me ? getFriendSuggestions(me) : Promise.resolve([]),
              getProfileVids(uid, {
                  _id: uid,
                  username: user.username,
                  displayName: user.displayName,
                  photo: user.photo,
              }),
          ])
        : [[], [], []];

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
        ["Mood:", user.mood || "—"],
        ["Away message:", user.awayMessage || "—"],
        ["Here for:", user.hereFor || "—"],
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
            <div className="profile-blocked">
                <p className="profile-blocked-title">
                    {displayNameOrUsername(user.displayName, user.username)} has
                    blocked you.
                </p>
                <p className="profile-blocked-text">
                    You can&apos;t view this profile or interact with this user.
                </p>
            </div>
        );
    }

    return (
        <div
            className="profile-page"
            style={
                {
                    "--profile-border": theme.border || "#6699cc",
                } as CSSProperties
            }
        >
            {safeCustomCss && (
                <style dangerouslySetInnerHTML={{ __html: safeCustomCss }} />
            )}
            <div id="wrap" className="profile-content" style={{ borderColor: theme.border }}>
                {!canView ? (
                    <div className="profile-private">
                        <p className="profile-private-title">
                            🔒 This profile is private
                        </p>
                        <p className="profile-private-text">
                            {displayNameOrUsername(
                                user.displayName,
                                user.username,
                            )}{" "}
                            only shares their profile with friends. Add them as
                            a friend to view it.
                        </p>
                    </div>
                ) : (
                    <div className="profile-layout">
                        {/* ---------------- Left column ---------------- */}
                        <div className="profile-main-column">
                            <Box
                                title={`${displayNameOrUsername(user.displayName, user.username)} (@${user.username})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-intro"
                            >
                                <div className="profile-intro-body">
                                    {/* Left: photo, name, username, buttons */}
                                    <div className="profile-photo-column">
                                        <UserAvatar
                                            src={
                                                user.photo ||
                                                "/images/avatar.png"
                                            }
                                            alt={`${displayNameOrUsername(user.displayName, user.username)}'s photo`}
                                            className="profile-photo"
                                            cloudinaryWidth={440}
                                        />

                                        {/* Actions */}
                                        {!isOwner && me && (
                                            <div className="profile-actions">
                                                {friendshipStatus ===
                                                    "none" && (
                                                    <ActionButton
                                                        action={sendFriendRequestAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn"
                                                    >
                                                        + Add as Friend
                                                    </ActionButton>
                                                )}
                                                {friendshipStatus ===
                                                    "pending_out" && (
                                                    <ActionButton
                                                        action={cancelFriendRequestAction.bind(
                                                            null,
                                                            outgoingRequest?._id.toString() ||
                                                                "",
                                                        )}
                                                        className="btn btn-danger"
                                                        confirmText={`Cancel your friend request to ${user.displayName}?`}
                                                    >
                                                        Cancel Request
                                                    </ActionButton>
                                                )}
                                                {friendshipStatus ===
                                                    "pending_in" && (
                                                    <>
                                                        <ActionButton
                                                            action={respondFriendRequestAction.bind(
                                                                null,
                                                                incomingRequest?._id.toString() ||
                                                                    "",
                                                                true,
                                                            )}
                                                            className="btn"
                                                        >
                                                            Accept Request
                                                        </ActionButton>
                                                    </>
                                                )}
                                                <Link
                                                    href={`/messages?to=${user.username}`}
                                                    className="btn profile-btn-link"
                                                >
                                                    Send Message
                                                </Link>
                                                <ActionButton
                                                    action={pokeAction.bind(
                                                        null,
                                                        uid,
                                                    )}
                                                    className="btn"
                                                >
                                                    Poke
                                                </ActionButton>
                                                {iBlockedThem ? (
                                                    <ActionButton
                                                        action={unblockUserAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn"
                                                    >
                                                        Unblock
                                                    </ActionButton>
                                                ) : (
                                                    <ActionButton
                                                        action={blockUserAction.bind(
                                                            null,
                                                            uid,
                                                        )}
                                                        className="btn"
                                                        confirmText="Block this user? They won't be able to interact with you."
                                                    >
                                                        Block User
                                                    </ActionButton>
                                                )}
                                                <details className="profile-report">
                                                    <summary className="btn profile-report-summary">
                                                        Report
                                                    </summary>
                                                    <div className="profile-report-body">
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
                                            <div className="profile-actions">
                                                <Link
                                                    href="/edit"
                                                    className="btn profile-btn-link"
                                                >
                                                    Edit Profile
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: brief table */}
                                    <div className="profile-details">
                                        <table className="profile-brief-table">
                                            <tbody>
                                                {brief.map(([k, v]) => (
                                                    <tr key={k}>
                                                        <td className="profile-brief-label">
                                                            {k}
                                                        </td>
                                                        <td className="profile-brief-value">
                                                            {v}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td className="profile-brief-label">
                                                        Profile views:
                                                    </td>
                                                    <td className="profile-brief-value">
                                                        <span className="profile-views-count">
                                                            {padViews(
                                                                user.profileViews,
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <YouTubeMusicPlayer
                                            key={user.theme?.youtubeVideoId}
                                            videoId={user.theme?.youtubeVideoId}
                                        />
                                    </div>
                                </div>
                            </Box>

                            <Box
                                title="My Interests"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-interests"
                            >
                                {user.interests.length > 0 ? (
                                    <div className="profile-interests-list">
                                        {user.interests.map((i) => (
                                            <span
                                                key={i}
                                                className="profile-interest-tag"
                                            >
                                                {i}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="profile-empty">
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
                                    <p className="profile-paragraph">
                                        <b>Favorite song:</b> “
                                        {user.favoriteSong}”
                                    </p>
                                ) : (
                                    <span className="profile-empty">
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
                                    <p className="profile-paragraph">
                                        {user.aboutMe}
                                    </p>
                                ) : (
                                    <span className="profile-empty">
                                        Hey everyone!! welcome to my profile
                                        lol. (edit your About Me!)
                                    </span>
                                )}
                            </Box>

                            <ProfileVids vids={profileVids} border={theme.border} />

                            <Box
                                title="Who I'd Like to Meet"
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-meet"
                            >
                                {user.whoIdLikeToMeet ? (
                                    <p className="profile-paragraph">
                                        {user.whoIdLikeToMeet}
                                    </p>
                                ) : (
                                    <span className="profile-empty">
                                        People who don&apos;t take life too
                                        seriously.
                                    </span>
                                )}
                            </Box>

                            <BulletinBoard
                                posts={bulletinPosts}
                                currentUserId={me}
                                currentUsername={currentUser?.username}
                                title={`Bulletin Board`}
                                border={theme.border}
                                friends={friendSuggestions}
                            />

                            {/* Testimonials */}
                            <Box
                                title={`Testimonials (${testimonials.length})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-testimonials"
                            >
                                {pendingTestimonials.length > 0 && (
                                    <div className="profile-pending-box">
                                        <p className="profile-pending-title">
                                            Pending approval (
                                            {pendingTestimonials.length})
                                        </p>
                                        {pendingTestimonials.map((t) => (
                                            <div
                                                key={t._id.toString()}
                                                className="profile-testimonial"
                                            >
                                                <span className="profile-testimonial-author">
                                                    {authorName(t.authorId)}
                                                </span>{" "}
                                                <span className="profile-testimonial-time">
                                                    {timeAgo(t.createdAt)}
                                                </span>
                                                <br />
                                                {t.body}
                                                <div className="profile-testimonial-actions">
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
                                    <span className="profile-empty">
                                        No testimonials yet.
                                    </span>
                                ) : (
                                    testimonials.map((t) => (
                                        <div
                                            key={t._id.toString()}
                                            className="profile-testimonial profile-testimonial-spaced profile-testimonial-flush"
                                        >
                                            <span className="profile-testimonial-author">
                                                {authorName(t.authorId)}
                                            </span>{" "}
                                            <span className="profile-testimonial-time">
                                                wrote {timeAgo(t.createdAt)}
                                            </span>
                                            <br />
                                            {t.body}
                                            {isOwner && (
                                                <div className="profile-testimonial-actions">
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
                                    <div className="profile-testimonial-form">
                                        <p className="profile-testimonial-form-title">
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
                        <div className="profile-sidebar">
                            {/* Six most recent friends */}
                            <Box
                                title={`${displayNameOrUsername(user.displayName, user.username).split(" ")[0]}'s Friends (recent ${topFriends.length})`}
                                border={theme.border}
                                bg="#f5f9ff"
                                className="profile-friends"
                            >
                                {topFriends.length === 0 ? (
                                    <span className="profile-empty">
                                        No friends yet.
                                    </span>
                                ) : (
                                    <>
                                        <div className="profile-friends-grid">
                                            {topFriends.map((f) => (
                                                <div
                                                    key={f._id.toString()}
                                                    className="profile-friend-card"
                                                >
                                                    <Link
                                                        href={`/${f.username}`}
                                                        className="profile-friend-photo-link"
                                                    >
                                                        <UserAvatar
                                                            src={
                                                                f.photo ||
                                                                "/images/avatar.png"
                                                            }
                                                            alt={displayNameOrUsername(
                                                                f.displayName,
                                                                f.username,
                                                            )}
                                                            className="profile-friend-photo"
                                                            cloudinaryWidth={
                                                                120
                                                            }
                                                        />
                                                    </Link>
                                                    <Link
                                                        href={`/${f.username}`}
                                                        className="profile-friend-name"
                                                    >
                                                        {displayNameOrUsername(
                                                            f.displayName,
                                                            f.username,
                                                        )}
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="profile-friends-footer">
                                            <Link
                                                href={`/${user.username}/friends`}
                                                className="profile-link"
                                            >
                                                View All Friends »
                                            </Link>
                                            {/* <Link
                                                href={`/${user.username}/friends`}
                                                className="profile-link"
                                            >
                                                Friends page
                                            </Link> */}
                                        </div>
                                    </>
                                )}
                            </Box>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
