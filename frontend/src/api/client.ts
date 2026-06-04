import axios, { isAxiosError } from "axios";
import { useAuthStore } from "../store/auth";

/** REST base: `{VITE_API_URL}/api/v1` in production, `/api/v1` in dev (Vite proxy). */
const apiRoot = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
const baseURL = apiRoot.length > 0 ? `${apiRoot}/api/v1` : "/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!isAxiosError(err) || err.response?.data == null) return fallback;
  const body = err.response.data as Record<string, unknown>;
  const e = body.error;
  if (typeof e === "string") return e;
  return fallback;
}
