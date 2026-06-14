import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { AppConfig } from "../config.js";

export function isFirebaseConfigured(config: AppConfig): boolean {
  return Boolean(config.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}

function ensureFirebaseApp(config: AppConfig): void {
  if (getApps().length > 0) return;

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON!) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function verifyFirebaseIdToken(
  config: AppConfig,
  idToken: string,
): Promise<DecodedIdToken> {
  if (!isFirebaseConfigured(config)) {
    throw new Error("Firebase is not configured");
  }

  ensureFirebaseApp(config);
  return getAuth().verifyIdToken(idToken);
}
