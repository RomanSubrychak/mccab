import { useCallback, useEffect, useReducer } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Small key-value storage that survives app restarts. Phones use SecureStore
// (Keychain on iOS, encrypted storage on Android). SecureStore doesn't support
// web, so the web build uses localStorage. Based on the Expo Router
// authentication guide: https://docs.expo.dev/router/advanced/authentication/

export async function getStorageItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
    } catch (error) {
      console.error("Local storage is unavailable:", error);
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setStorageItemAsync(key: string, value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error("Local storage is unavailable:", error);
    }
    return;
  }
  if (value === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

type StorageState = [isLoading: boolean, value: string | null];

// Like useState, but the value is saved under `key`. isLoading is true until
// the saved value has been read.
export function useStorageState(key: string): [StorageState, (value: string | null) => void] {
  const [state, setState] = useReducer(
    (_: StorageState, value: string | null): StorageState => [false, value],
    [true, null],
  );

  useEffect(() => {
    getStorageItemAsync(key).then(setState);
  }, [key]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key],
  );

  return [state, setValue];
}
