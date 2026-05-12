import admin from "firebase-admin";
import type { AppConfig } from "../config";

let initialized = false;

function parseServiceAccount(json: string): admin.ServiceAccount {
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { project_id?: unknown }).project_id !== "string" ||
    typeof (parsed as { client_email?: unknown }).client_email !== "string" ||
    typeof (parsed as { private_key?: unknown }).private_key !== "string"
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be a service account JSON object");
  }
  return parsed as admin.ServiceAccount;
}

export function isFirebaseAuthConfigured(config: AppConfig): boolean {
  return config.firebaseServiceAccountJson.length > 0;
}

export function ensureFirebaseAdmin(config: AppConfig): void {
  if (initialized) return;
  if (!isFirebaseAuthConfigured(config)) {
    throw new Error("Firebase Admin is not configured");
  }
  const credential = admin.credential.cert(parseServiceAccount(config.firebaseServiceAccountJson));
  admin.initializeApp({ credential });
  initialized = true;
}

export async function verifyFirebaseIdToken(
  config: AppConfig,
  idToken: string,
): Promise<admin.auth.DecodedIdToken> {
  ensureFirebaseAdmin(config);
  return admin.auth().verifyIdToken(idToken);
}
