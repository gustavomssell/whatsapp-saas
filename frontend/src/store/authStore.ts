import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  phone: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  orgId: string | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      orgId: null,
      setAuth: (token, user) =>
        set({ token, user, orgId: user.org_id }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, orgId: null }),
    }),
    { name: "wpsaas-auth" }
  )
);
