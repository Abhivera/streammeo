import { signInWithPopup } from "firebase/auth";
import { api } from "../api/client";
import { createGoogleAuthProvider, getFirebaseAuth } from "../firebase/client";
import type { Workspace } from "../types";

export async function signInWithGoogleAndCreateSession(params: {
  workspaceName?: string | undefined;
}): Promise<{ token: string; workspace: Workspace }> {
  const auth = getFirebaseAuth();
  const cred = await signInWithPopup(auth, createGoogleAuthProvider());
  const idToken = await cred.user.getIdToken();
  const { data } = await api.post<{ token: string; workspace: Workspace }>("/auth/firebase-session", {
    idToken,
    ...(params.workspaceName ? { workspaceName: params.workspaceName } : {}),
  });
  return { token: data.token, workspace: data.workspace };
}
