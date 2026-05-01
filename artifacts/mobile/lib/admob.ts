import { Platform } from "react-native";

let mobileAds: { default: () => { initialize: () => Promise<void> } } | null = null;

export async function initAdMob(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    mobileAds = require("react-native-google-mobile-ads");
    await mobileAds!.default().initialize();
  } catch {
  }
}

export async function requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== "ios") return;
  try {
    const { requestTrackingPermissionsAsync } = await import("expo-tracking-transparency");
    const { status } = await requestTrackingPermissionsAsync();
    if (status === "granted") {
      await import("react-native-google-mobile-ads").then((m) =>
        m.default().setRequestConfiguration({
          maxAdContentRating: "PG",
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        })
      ).catch(() => {});
    }
  } catch {
  }
}
