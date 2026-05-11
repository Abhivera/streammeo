import { api } from "../api/client";
import type { Workspace } from "../types";

export type DemoLoginResult = Readonly<
  | { ok: true; token: string; workspace: Workspace }
  | { ok: false; status?: number; message: string }
>;

export async function demoDashboardLogin(): Promise<DemoLoginResult> {
  try {
    const { data } = await api.post<{ token: string; workspace: Workspace }>("/auth/demo-login");
    return { ok: true, token: data.token, workspace: data.workspace };
  } catch (err: unknown) {
    const res =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number; data?: { error?: string } } }).response
        : undefined;
    const status = res?.status;
    const serverMsg = res?.data?.error;
    if (status === 503) {
      return {
        ok: false,
        status,
        message: serverMsg ?? "Run npm run db:seed from the repo root, then try again.",
      };
    }
    if (status === 404) {
      return {
        ok: false,
        status,
        message: "Demo login is off. Set DEMO_MODE=true on the backend and restart.",
      };
    }
    return { ok: false, status, message: serverMsg ?? "Demo login failed." };
  }
}
