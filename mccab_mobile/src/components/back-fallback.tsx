import { useEffect } from "react";
import { Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation, type Href } from "expo-router";

import { useThemeColors } from "@/constants/theme";

// Opened directly (a refresh or a shared link on web) a screen has nothing to
// go back to, so the header has no back arrow. This adds one that goes to `href`.
export function useBackFallback(href: Href) {
  const navigation = useNavigation();
  const colors = useThemeColors();
  useEffect(() => {
    if (router.canGoBack()) return;
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.replace(href)}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          style={{ paddingHorizontal: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, href, colors.primary]);
}
