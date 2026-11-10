import { createContext, useContext, useState, type ReactNode } from "react";

import type { AuthUser } from "@/lib/api";

// "rider" only books seats. "rider_driver" can also offer rides in their own car.
export type UserRole = "rider" | "rider_driver";

type Session = {
  token: string;
  user: AuthUser;
  termsAccepted: boolean;
  role: UserRole | null;
};

type SessionContextValue = {
  session: Session | null;
  signIn: (token: string, user: AuthUser) => void;
  acceptTerms: () => void;
  chooseRole: (role: UserRole) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// TODO: keep the session in memory only for now. Store the token securely (e.g. expo-secure-store)
// and save terms acceptance and role on the server, so they survive app restarts.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const value: SessionContextValue = {
    session,
    signIn: (token, user) => setSession({ token, user, termsAccepted: false, role: null }),
    acceptTerms: () => setSession((prev) => (prev ? { ...prev, termsAccepted: true } : prev)),
    chooseRole: (role) => setSession((prev) => (prev ? { ...prev, role } : prev)),
    signOut: () => setSession(null),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return context;
}

// The screen a user should be on for their current session state.
export function nextRoute(session: Session | null) {
  if (!session) return "/login" as const;
  if (!session.termsAccepted) return "/terms" as const;
  if (!session.role) return "/choose-role" as const;
  return "/home" as const;
}
