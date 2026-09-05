import type { ObjectId } from "mongodb";

export type Role = "user" | "admin";

export interface Theme {
  border: string;
  customCss?: string;
  youtubeVideoId?: string;
}

export interface User {
  _id: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  banned: boolean;
  emailVerified?: boolean;
  authProvider?: "local" | "google";
  onboardingCompleted?: boolean;
  createdAt: Date;

  displayName: string;
  firstName: string;
  lastName: string;
  gender: string;
  location: string;
  interests: string[];
  relationshipStatus: string;
  orientation: string;
  zodiac: string;
  bodyType: string;
  occupation: string;
  aboutMe: string;
  hereFor: string;
  whoIdLikeToMeet: string;
  favoriteSong: string;
  mood: string;
  awayMessage: string;
  photo: string | null;
  photoPublicId?: string | null;

  theme: Theme;
  profileViews: number;
  lastActive: Date;
  notificationAcknowledgedAt?: Date;

  isPrivate: boolean;
  hideFromSearch: boolean;
  whoCanMessage: "everyone" | "friends" | "nobody";
  whoCanFriendRequest: "everyone" | "nobody";
}

export type BulletinVisibility = "public" | "friends" | "private";
export type GroupPrivacy = "public" | "private";
export type GroupMemberStatus = "pending" | "approved";

export interface Group {
  _id: ObjectId;
  name: string;
  privacy: GroupPrivacy;
  photo: string | null;
  photoPublicId?: string | null;
  ownerId: ObjectId;
  createdAt: Date;
}

export interface GroupMember {
  _id: ObjectId;
  groupId: ObjectId;
  userId: ObjectId;
  status: GroupMemberStatus;
  createdAt: Date;
}

export interface GroupListItem {
  _id: string;
  name: string;
  privacy: GroupPrivacy;
  photo: string | null;
  ownerId: string;
  createdAt: Date | string;
}

export interface GroupPost {
  _id: ObjectId;
  groupId: ObjectId;
  authorId: ObjectId;
  body: string;
  photo?: string | null;
  photoPublicId?: string | null;
  createdAt: Date;
}

export interface GroupPostCard {
  _id: string;
  groupId: string;
  authorId: string;
  body: string;
  photo?: string | null;
  photoPublicId?: string | null;
  createdAt: string;
  author: { _id: string; username: string; displayName: string; photo: string | null };
  reactions: BulletinReactionSummary[];
  myReaction: string | null;
  comments: BulletinCommentCard[];
}

export interface BulletinPost {
  _id: ObjectId;
  authorId: ObjectId;
  body: string;
  visibility: BulletinVisibility;
  photo?: string | null;
  photoPublicId?: string | null;
  createdAt: Date;
  // User ids of friends mentioned via @username in the body, validated on the
  // server at create/update time so the client can't tag non-friends.
  mentionedUserIds?: ObjectId[];
}

// Friend-shaped subset used by the @mention autocomplete in the post composer.
export interface MentionFriend {
  _id: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photo: string | null;
}

export interface BulletinPostWithAuthor extends BulletinPost {
  author: Pick<User, "_id" | "username" | "displayName" | "photo">;
}

// A validated @mention: the mentioned user's id and username, used to render
// profile links for mentions in post bodies.
export interface BulletinMentionRef {
  userId: string;
  username: string;
}

export interface BulletinPostWithMentions extends BulletinPostWithComments {
  mentionRefs: BulletinMentionRef[];
}

export interface BulletinComment {
  _id: ObjectId;
  postId: ObjectId;
  authorId: ObjectId;
  body: string;
  createdAt: Date;
  // Friends mentioned via @username in the comment body, validated on the
  // server at create/update time.
  mentionedUserIds?: ObjectId[];
}

export interface BulletinCommentWithAuthor extends BulletinComment {
  author: Pick<User, "_id" | "username" | "displayName" | "photo">;
  reactions: BulletinReactionSummary[];
  myReaction: string | null;
  mentionRefs: BulletinMentionRef[];
}

export const REACTION_TYPES = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;

export interface BulletinCommentReaction {
  _id: ObjectId;
  commentId: ObjectId;
  postId: ObjectId;
  userId: ObjectId;
  type: string;
  createdAt: Date;
}

export interface BulletinReaction {
  _id: ObjectId;
  postId: ObjectId;
  userId: ObjectId;
  type: string;
  createdAt: Date;
}

export interface BulletinReactionSummary {
  type: string;
  count: number;
}

export interface BulletinPostWithComments extends BulletinPostWithAuthor {
  reactions: BulletinReactionSummary[];
  myReaction: string | null;
  comments: BulletinCommentWithAuthor[];
}

// Client-friendly shape: ObjectIds and Dates flattened to plain values so posts
// can be passed to client components and returned from server actions.
export interface BulletinAuthorCard {
  _id: string;
  username: string;
  displayName: string;
  photo: string | null;
}

export interface BulletinCommentCard {
  _id: string;
  authorId: string;
  body: string;
  createdAt: Date | string;
  author: BulletinAuthorCard;
  // Optional because group comments share this shape but have no reactions.
  reactions?: BulletinReactionSummary[];
  myReaction?: string | null;
  // Validated @mentions resolved to usernames for rendering profile links.
  mentions?: BulletinMentionRef[];
}

export interface BulletinPostCard {
  _id: string;
  authorId: string;
  body: string;
  visibility: BulletinVisibility;
  photo?: string | null;
  createdAt: Date | string;
  author: BulletinAuthorCard;
  reactions: BulletinReactionSummary[];
  myReaction: string | null;
  comments: BulletinCommentCard[];
  mentionedUserIds?: string[];
  // Validated @mentions resolved to usernames for rendering profile links.
  mentions?: BulletinMentionRef[];
}

export interface SerializedBulletinComment {
  _id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: BulletinAuthorCard;
  reactions?: BulletinReactionSummary[];
  myReaction?: string | null;
  mentions?: BulletinMentionRef[];
}

export interface SerializedBulletinPost {
  _id: string;
  authorId: string;
  body: string;
  visibility: BulletinVisibility;
  photo?: string | null;
  createdAt: string;
  author: BulletinAuthorCard;
  reactions: BulletinReactionSummary[];
  myReaction: string | null;
  comments: SerializedBulletinComment[];
  mentionedUserIds?: string[];
  mentions?: BulletinMentionRef[];
}

export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export type FriendshipStatus = "pending" | "approved";

export interface Friendship {
  _id: ObjectId;
  requesterId: ObjectId;
  addresseeId: ObjectId;
  status: FriendshipStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface Message {
  _id: ObjectId;
  senderId: ObjectId;
  recipientId: ObjectId;
  body: string;
  read: boolean;
  createdAt: Date;
}

// Client-friendly shape for the message thread: ObjectIds and Dates flattened
// so messages can be passed to client components and returned from server actions.
export interface SerializedMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// How many messages the thread loads per page; older ones are fetched lazily
// when the user scrolls to the top.
export const MESSAGE_PAGE_SIZE = 50;

export type ChatboxVisibility = "public" | "friends";

export interface Chatbox {
  _id: ObjectId;
  name: string;
  createdBy: ObjectId;
  visibility: ChatboxVisibility;
  createdAt: Date;
}

export interface ChatboxReplyRef {
  messageId: string;
  authorId: string;
  authorDisplayName: string;
  authorUsername: string;
  body: string;
}

export interface ChatboxMessage {
  _id: ObjectId;
  chatboxId: ObjectId;
  senderId: ObjectId;
  body: string;
  createdAt: Date;
  replyTo?: ChatboxReplyRef;
}

export interface ChatboxAuthorCard {
  _id: string;
  username: string;
  displayName: string;
  photo: string | null;
}

export interface ChatboxListItem {
  _id: string;
  name: string;
  visibility: ChatboxVisibility;
  createdAt: Date | string;
  createdBy: string;
  author: ChatboxAuthorCard;
  messageCount: number;
  lastMessageAt: Date | string | null;
}

export interface ChatboxMessageCard {
  _id: string;
  chatboxId: string;
  senderId: string;
  body: string;
  createdAt: string;
  author: ChatboxAuthorCard;
  replyTo?: ChatboxReplyRef;
}

export type TestimonialStatus = "pending" | "approved";

export interface Testimonial {
  _id: ObjectId;
  authorId: ObjectId;
  profileId: ObjectId;
  body: string;
  status: TestimonialStatus;
  createdAt: Date;
}

export interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  type: string;
  actorId: ObjectId;
  text: string;
  link: string;
  read: boolean;
  createdAt: Date;
}

export interface Poke {
  _id: ObjectId;
  fromId: ObjectId;
  toId: ObjectId;
  createdAt: Date;
}

export interface Block {
  _id: ObjectId;
  blockerId: ObjectId;
  blockedId: ObjectId;
  createdAt: Date;
}

export interface Report {
  _id: ObjectId;
  reporterId: ObjectId;
  reportedId: ObjectId;
  type: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: Date;
}
