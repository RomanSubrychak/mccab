import { StyleSheet, Text } from "react-native";

import { InfoCard, TabScreen } from "@/components/tab-screen";
import { useThemeColors } from "@/constants/theme";

export default function RidesScreen() {
  const colors = useThemeColors();
  return (
    <TabScreen title="Rides" subtitle="Rides you offer or book will show here.">
      <InfoCard title="No rides yet">
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Offering and booking rides is the next feature to be built.
        </Text>
      </InfoCard>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
});
