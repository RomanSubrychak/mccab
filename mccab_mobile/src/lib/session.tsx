import { createContext, use, type ReactNode } from "react";

import { useStorageState } from "@/lib/storage";

const TOKEN_KEY = "mccab.token";

type SessionContextValue = {
  // The login token, or null when signed out.
  token: string | null;
  // True until the saved token has been read at startup.
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Keeps the login token, saved securely so the user stays signed in after
// closing the app. The root layout shows the app or the login screen from it.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [[isLoading, token], setToken] = useStorageState(TOKEN_KEY);

  const value: SessionContextValue = {
    token,
    isLoading,
    signIn: (newToken) => setToken(newToken),
    signOut: () => setToken(null),
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return context;
}
