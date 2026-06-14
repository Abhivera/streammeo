import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseConfig } from "../config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function ensureFirebase(): Auth {
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error("Firebase is not configured");
  }
  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
  }
  return auth!;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const firebaseAuth = ensureFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(firebaseAuth, provider);
}

export async function getGoogleIdToken(): Promise<string> {
  const result = await signInWithGoogle();
  const token = await result.user.getIdToken();
  if (!token) {
    throw new Error("Could not get Google sign-in token");
  }
  return token;
}
