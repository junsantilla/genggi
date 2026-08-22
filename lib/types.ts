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

export interface BulletinPost {
  _id: ObjectId;
  authorId: ObjectId;
  body: string;
  visibility: BulletinVisibility;
  photo?: string | null;
  photoPublicId?: string | null;
  createdAt: Date;
}

export interface BulletinPostWithAuthor extends BulletinPost {
  author: Pick<User, "_id" | "username" | "displayName" | "photo">;
}

export interface BulletinComment {
  _id: ObjectId;
  postId: ObjectId;
  authorId: ObjectId;
  body: string;
  createdAt: Date;
}

export interface BulletinCommentWithAuthor extends BulletinComment {
  author: Pick<User, "_id" | "username" | "displayName" | "photo">;
}

export const REACTION_TYPES = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;

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
}

export interface SerializedBulletinComment {
  _id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: BulletinAuthorCard;
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
