"use client";

import { useActionState } from "react";
import {
  GENDERS,
  STATUSES,
  ZODIACS,
  BODY_TYPES,
  ORIENTATIONS,
} from "@/lib/utils";
import type { User } from "@/lib/types";

export type EditableUser = Pick<
  User,
  | "displayName"
  | "firstName"
  | "lastName"
  | "gender"
  | "location"
  | "relationshipStatus"
  | "orientation"
  | "zodiac"
  | "bodyType"
  | "occupation"
  | "mood"
  | "awayMessage"
  | "favoriteSong"
  | "interests"
  | "aboutMe"
  | "whoIdLikeToMeet"
>;

export default function EditForm({
  action,
  user,
}: {
  action: (prev: { ok?: boolean; error?: string }, formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  user: EditableUser;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <form action={formAction} className="grid grid-cols-2 gap-2.5">
      <div>
        <label className="label">Display Name</label>
        <input name="displayName" defaultValue={user.displayName} className="input" />
      </div>
      <div>
        <label className="label">First Name</label>
        <input name="firstName" defaultValue={user.firstName} className="input" />
      </div>
      <div>
        <label className="label">Last Name</label>
        <input name="lastName" defaultValue={user.lastName} className="input" />
      </div>
      <div>
        <label className="label">Gender</label>
        <select name="gender" defaultValue={user.gender} className="input">
          {GENDERS.map((g) => (
            <option key={g || "blank"} value={g}>{g || "—"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Hometown / Location</label>
        <input name="location" defaultValue={user.location} className="input" placeholder="San Jose, CA" />
      </div>
      <div>
        <label className="label">Relationship Status</label>
        <select name="relationshipStatus" defaultValue={user.relationshipStatus} className="input">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Orientation</label>
        <select name="orientation" defaultValue={user.orientation} className="input">
          {ORIENTATIONS.map((o) => (
            <option key={o || "blank"} value={o}>{o || "—"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Zodiac</label>
        <select name="zodiac" defaultValue={user.zodiac} className="input">
          {ZODIACS.map((z) => (
            <option key={z || "blank"} value={z}>{z || "—"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Body Type</label>
        <select name="bodyType" defaultValue={user.bodyType} className="input">
          {BODY_TYPES.map((b) => (
            <option key={b || "blank"} value={b}>{b || "—"}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Occupation</label>
        <input name="occupation" defaultValue={user.occupation} className="input" placeholder="Student" />
      </div>
      <div>
        <label className="label">Mood</label>
        <input name="mood" defaultValue={user.mood} className="input" placeholder="chill" />
      </div>
      <div>
        <label className="label">Away Message</label>
        <input name="awayMessage" defaultValue={user.awayMessage} className="input" placeholder="brb..." />
      </div>
      <div>
        <label className="label">Favorite Song</label>
        <input name="favoriteSong" defaultValue={user.favoriteSong} className="input" placeholder="...Baby One More Time" />
      </div>
      <div>
        <label className="label">Interests (comma separated)</label>
        <input name="interests" defaultValue={user.interests.join(", ")} className="input" placeholder="AIM, mix CDs, LAN parties" />
      </div>
      <div className="col-span-2">
        <label className="label">About Me</label>
        <textarea name="aboutMe" defaultValue={user.aboutMe} rows={4} className="input" />
      </div>
      <div className="col-span-2">
        <label className="label">Who I&apos;d Like to Meet</label>
        <textarea name="whoIdLikeToMeet" defaultValue={user.whoIdLikeToMeet} rows={3} className="input" />
      </div>
      <div className="col-span-2">
        {state.error && (
          <div className="text-red-600 text-[12px] font-bold bg-red-50 border border-red-200 px-2 py-1 mb-2">
            {state.error}
          </div>
        )}
        {state.ok && (
          <div className="text-green-700 text-[12px] font-bold bg-green-50 border border-green-200 px-2 py-1 mb-2">
            Saved!
          </div>
        )}
        <button type="submit" disabled={pending} className="btn py-1.5 text-sm">
          {pending ? "..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
