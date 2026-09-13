import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/authApi";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (tokens: { access_token: string; refresh_token: string; user: User }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ access_token, refresh_token, user }) =>
        set({ accessToken: access_token, refreshToken: refresh_token, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "service-hub-auth" }
  )
);
