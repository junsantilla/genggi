import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

function getFirebaseAuth(): Auth | null {
    if (!isFirebaseConfigured) return null;
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getAuth(app);
}

export const firebaseAuth = (isFirebaseConfigured ? getFirebaseAuth() : null) as unknown as Auth;

export async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    if (!auth) {
        throw new Error("Google Sign-In is not configured in this environment.");
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}
