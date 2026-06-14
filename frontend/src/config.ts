function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBaseUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

const apiUrl = normalizeBaseUrl(trimEnv(import.meta.env.VITE_API_URL));
const appSyncGraphqlUrl = trimEnv(import.meta.env.VITE_APPSYNC_GRAPHQL_URL);
const appSyncApiKey = trimEnv(import.meta.env.VITE_APPSYNC_API_KEY);
const razorpayKeyId = trimEnv(import.meta.env.VITE_RAZORPAY_KEY_ID);
const firebaseApiKey = trimEnv(import.meta.env.VITE_FIREBASE_API_KEY);
const firebaseAuthDomain = trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
const firebaseProjectId = trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const firebaseAppId = trimEnv(import.meta.env.VITE_FIREBASE_APP_ID);

export const API_BASE_URL = apiUrl;

export function getPublicApiUrl(): string {
  if (apiUrl) return apiUrl;
  if (import.meta.env.DEV) return "http://localhost:3001";
  return window.location.origin;
}

export function isRemoteApi(): boolean {
  if (!apiUrl) return false;
  try {
    const host = new URL(apiUrl).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return true;
  }
}

export function isSocketIoEnabled(): boolean {
  return !isRemoteApi();
}

export function getAppSyncConfig(): { httpUrl: string; apiKey: string; realtimeUrl: string; host: string } | null {
  if (!appSyncGraphqlUrl || !appSyncApiKey) return null;

  let host: string;
  try {
    host = new URL(appSyncGraphqlUrl).host;
  } catch {
    return null;
  }

  const realtimeUrl = appSyncGraphqlUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://")
    .replace("appsync-api", "appsync-realtime-api");

  return {
    httpUrl: appSyncGraphqlUrl,
    apiKey: appSyncApiKey,
    realtimeUrl,
    host,
  };
}

export function isAppSyncConfigured(): boolean {
  return getAppSyncConfig() !== null;
}

export const RAZORPAY_KEY_ID = razorpayKeyId ?? null;

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export function getFirebaseConfig(): FirebaseConfig | null {
  if (!firebaseApiKey || !firebaseAuthDomain || !firebaseProjectId || !firebaseAppId) {
    return null;
  }
  return {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    projectId: firebaseProjectId,
    appId: firebaseAppId,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export const REMOTE_POLL_INTERVAL_MS = 30_000;
