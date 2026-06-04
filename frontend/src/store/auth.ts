import { create } from "zustand";

const TOKEN_KEY = "vw_token";

type AuthSlice = Readonly<{
  token: string | null;
  setToken: (t: string | null) => void;
}>;

function readStoredToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthSlice>((set) => ({
  token: readStoredToken(),
  setToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    set({ token });
  },
}));
