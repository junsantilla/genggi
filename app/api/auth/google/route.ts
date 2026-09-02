import { NextResponse } from "next/server";
import { getDb, ObjectId } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

function firebaseProjectId() {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
}

export async function POST(request: Request) {
    try {
        const { idToken } = (await request.json()) as { idToken?: unknown };
        if (typeof idToken !== "string" || !idToken) {
            return NextResponse.json({ error: "Missing Google credential." }, { status: 400 });
        }

        const projectId = firebaseProjectId();
        if (!projectId || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            return NextResponse.json({ error: "Firebase is not configured on the server." }, { status: 500 });
        }

        // Firebase's public token verification endpoint validates the signature,
        // issuer, audience, and expiry without adding an Admin SDK dependency.
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
                cache: "no-store",
            },
        );
        const payload = (await response.json()) as {
            users?: Array<{ localId?: string; email?: string; displayName?: string; photoUrl?: string; emailVerified?: boolean }>;
        };
        const googleUser = payload.users?.[0];
        if (!response.ok || !googleUser?.localId || !googleUser.email) {
            return NextResponse.json({ error: "Invalid Google credential." }, { status: 401 });
        }

        const email = googleUser.email.trim().toLowerCase();
        const photo = googleUser.photoUrl?.trim() || "/images/avatar.png";
        const db = getDb();
        let user = await db.collection("users").findOne({ email });
        if (user?.banned) return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });

        if (!user) {
            const baseUsername = email.split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 16) || "user";
            let username = baseUsername;
            let suffix = 1;
            while (await db.collection("users").findOne({ username })) {
                username = `${baseUsername.slice(0, 20 - String(suffix).length)}${suffix++}`;
            }
            const displayName = googleUser.displayName?.trim() || username;
            const newUser = {
                _id: new ObjectId(), username, email, passwordHash: hashPassword(crypto.randomUUID()),
                role: "user", banned: false, emailVerified: true, createdAt: new Date(),
                displayName, firstName: displayName, lastName: "", gender: "", location: "", interests: [],
                relationshipStatus: "Single", orientation: "", zodiac: "", bodyType: "", occupation: "",
                aboutMe: "", hereFor: "", whoIdLikeToMeet: "", favoriteSong: "", mood: "", awayMessage: "",
                photo, theme: { border: "#6699cc", customCss: "" }, profileViews: 0,
                lastActive: new Date(), isPrivate: false, hideFromSearch: false,
                whoCanMessage: "everyone", whoCanFriendRequest: "everyone",
            };
            await db.collection("users").insertOne(newUser);
            user = newUser;
        } else {
            await db.collection("users").updateOne({ _id: user._id }, { $set: { emailVerified: true, photo } });
        }

        await createSession(user._id.toString());
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Google login failed." }, { status: 500 });
    }
}
