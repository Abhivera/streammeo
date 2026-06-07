import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken } from "../api/client";
import type { User, Workspace } from "../types";

type AuthState = {
  token: string | null;
  user: User | null;
  workspace: Workspace | null;
  setSession: (token: string, user: User, workspace: Workspace) => void;
  setToken: (token: string | null) => void;
  setWorkspace: (workspace: Workspace) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      workspace: null,
      setSession: (token, user, workspace) => {
        setAuthToken(token);
        set({ token, user, workspace });
      },
      setToken: (token) => {
        setAuthToken(token);
        if (!token) set({ token: null, user: null, workspace: null });
        else set({ token });
      },
      setWorkspace: (workspace) => set({ workspace }),
    }),
    {
      name: "streammeo-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    },
  ),
);
