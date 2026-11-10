import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

import * as api from "@/lib/api";
import { ApiError, type Profile, type ProfileChanges, type VehicleInput } from "@/lib/api";
import { useSession } from "@/lib/session";

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  // Set when loading failed; the profile page shows it with a retry button.
  loadError: string | null;
  reload: () => void;
  // These throw ApiError on failure so screens can show the message by the right field.
  update: (changes: ProfileChanges) => Promise<void>;
  saveVehicle: (vehicle: VehicleInput) => Promise<void>;
  removeVehicle: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

// Loads the signed-in user's profile once and shares it with every screen
// inside the signed-in part of the app.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { token, signIn, signOut } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Runs an API call with the current token. A 401 means the token was revoked
  // (password changed elsewhere, account deleted, expired): sign out.
  const withToken = useCallback(
    async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
      if (!token) throw new ApiError("You're signed out.", 401);
      try {
        return await call(token);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) signOut();
        throw error;
      }
    },
    [token, signOut],
  );

  const reload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    withToken(api.getProfile)
      .then(setProfile)
      .catch((error) => {
        setLoadError(error instanceof ApiError ? error.message : "Couldn't load your profile.");
      })
      .finally(() => setIsLoading(false));
  }, [withToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value: ProfileContextValue = {
    profile,
    isLoading,
    loadError,
    reload,
    update: async (changes) => {
      setProfile(await withToken((t) => api.updateProfile(t, changes)));
    },
    saveVehicle: async (vehicle) => {
      setProfile(await withToken((t) => api.saveVehicle(t, vehicle)));
    },
    removeVehicle: async () => {
      setProfile(await withToken(api.removeVehicle));
    },
    changePassword: async (currentPassword, newPassword) => {
      // The old token stops working, so keep this device signed in with the new one.
      signIn(await withToken((t) => api.changePassword(t, currentPassword, newPassword)));
    },
    deleteAccount: async (password) => {
      await withToken((t) => api.deleteAccount(t, password));
      signOut();
    },
  };

  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileContextValue {
  const context = use(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used inside <ProfileProvider>.");
  }
  return context;
}
