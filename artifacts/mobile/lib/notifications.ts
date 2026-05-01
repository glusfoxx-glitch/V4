import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { fetchUpcomingSessions, type UpcomingSession } from "./f1";

const SCHEDULED_KEY = "@f1.scheduledNotificationIds";
const ENABLED_KEY = "@f1.notificationsEnabled";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getNotificationsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ENABLED_KEY);
  return v === "1";
}

export async function setNotificationsEnabled(on: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, on ? "1" : "0");
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function clearScheduled(): Promise<void> {
  const raw = await AsyncStorage.getItem(SCHEDULED_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  await Promise.allSettled(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
  await AsyncStorage.removeItem(SCHEDULED_KEY);
}

async function scheduleSession(s: UpcomingSession): Promise<string[]> {
  const startMs = new Date(s.startIso).getTime();
  const startDate = new Date(startMs);
  const endDate = new Date(startMs + estimatedDurationMs(s.type));
  const ids: string[] = [];

  if (startDate.getTime() > Date.now()) {
    const startId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${s.label} — ${s.gpName}`,
        body: `La session démarre maintenant. Bonne course !`,
        data: { gpId: s.gpId, type: s.type, kind: "start" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: startDate,
      },
    });
    ids.push(startId);
  }

  if (endDate.getTime() > Date.now()) {
    const endId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Fin de session — ${s.gpName}`,
        body: `Les résultats de ${s.label} sont disponibles.`,
        data: { gpId: s.gpId, type: s.type, kind: "end" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endDate,
      },
    });
    ids.push(endId);
  }
  return ids;
}

function estimatedDurationMs(type: string): number {
  switch (type) {
    case "fp1":
    case "fp2":
    case "fp3":
      return 60 * 60 * 1000;
    case "sprint_quali":
    case "qualifying":
      return 60 * 60 * 1000;
    case "sprint":
      return 60 * 60 * 1000;
    case "race":
      return 2 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

export async function rescheduleAll(): Promise<{ scheduled: number }> {
  if (Platform.OS === "web") return { scheduled: 0 };
  await clearScheduled();
  const sessions = await fetchUpcomingSessions();
  const allIds: string[] = [];
  for (const s of sessions) {
    const ids = await scheduleSession(s);
    allIds.push(...ids);
  }
  await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(allIds));
  return { scheduled: sessions.length };
}

export async function disableAll(): Promise<void> {
  await clearScheduled();
}
