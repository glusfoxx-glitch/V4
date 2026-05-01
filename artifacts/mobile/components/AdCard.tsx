import React from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

const AD_UNIT_ID = "ca-app-pub-7167269478147921/7100670551";

let BannerAd: React.ComponentType<{
  unitId: string;
  size: string;
  requestOptions?: object;
}> | null = null;
let BannerAdSize: Record<string, string> = {};
let TestIds: Record<string, string> = {};

if (Platform.OS !== "web") {
  try {
    const admob = require("react-native-google-mobile-ads");
    BannerAd = admob.BannerAd;
    BannerAdSize = admob.BannerAdSize;
    TestIds = admob.TestIds;
  } catch {
  }
}

export function AdCard() {
  const colors = useColors();

  if (Platform.OS === "web" || !BannerAd) {
    return null;
  }

  const unitId = __DEV__ ? (TestIds?.BANNER ?? AD_UNIT_ID) : AD_UNIT_ID;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.labelRow}>
        <View style={[styles.adBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.adBadgeText, { color: colors.mutedForeground }]}>PUBLICITÉ</Text>
        </View>
      </View>
      <View style={styles.bannerWrapper}>
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.MEDIUM_RECTANGLE ?? "MEDIUM_RECTANGLE"}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  labelRow: {
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  adBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  bannerWrapper: {
    paddingBottom: 12,
    alignItems: "center",
  },
});
