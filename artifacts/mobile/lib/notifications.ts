import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { fetchUpcomingSessions, type UpcomingSession } from "./f1";

const SCHEDULED_KEY = "@f1.scheduledNotificationIds";
const SESSIONS_FINGERPRINT_KEY = "@f1.scheduledSessionsFingerprint";
const ENABLED_KEY = "@f1.notificationsEnabled";

let isRescheduling = false;

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
  await AsyncStorage.removeItem(SESSIONS_FINGERPRINT_KEY);
}

function estimatedDurationMs(type: string): number {
  switch (type) {
    case "race":
      return 2 * 60 * 60 * 1000;
    case "fp1":
    case "fp2":
    case "fp3":
    case "sprint_quali":
    case "qualifying":
    case "sprint":
    default:
      return 60 * 60 * 1000;
  }
}

async function scheduleSession(s: UpcomingSession): Promise<string[]> {
  const startMs = new Date(s.startIso).getTime();
  const durationMs = estimatedDurationMs(s.type);
  const endMs = startMs + durationMs;
  const resultsMs = endMs + 20 * 60 * 1000;
  const now = Date.now();
  const ids: string[] = [];

  if (startMs > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${s.label} — ${s.gpName}`,
        body: `La session démarre maintenant !`,
        data: { gpId: s.gpId, type: s.type, kind: "start" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(startMs),
      },
    });
    ids.push(id);
  }

  if (endMs > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Session terminée — ${s.gpName}`,
        body: `${s.label} est terminée. Les résultats arrivent bientôt.`,
        data: { gpId: s.gpId, type: s.type, kind: "end" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endMs),
      },
    });
    ids.push(id);
  }

  if (resultsMs > now) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Résultats disponibles — ${s.gpName}`,
        body: `Le classement de ${s.label} est publié !`,
        data: { gpId: s.gpId, type: s.type, kind: "results" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(resultsMs),
      },
    });
    ids.push(id);
  }

  return ids;
}

export async function rescheduleAll(): Promise<{ scheduled: number }> {
  if (Platform.OS === "web") return { scheduled: 0 };
  if (isRescheduling) return { scheduled: 0 };
  isRescheduling = true;
  try {
    const sessions = await fetchUpcomingSessions();
    const fingerprint = sessions
      .map((s) => `${s.gpId}:${s.type}:${s.startIso}`)
      .join("|");

    const prevFingerprint = await AsyncStorage.getItem(SESSIONS_FINGERPRINT_KEY);
    if (prevFingerprint === fingerprint) {
      return { scheduled: sessions.length };
    }

    await clearScheduled();

    const allIds: string[] = [];
    for (const s of sessions) {
      const ids = await scheduleSession(s);
      allIds.push(...ids);
    }

    await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(allIds));
    await AsyncStorage.setItem(SESSIONS_FINGERPRINT_KEY, fingerprint);
    return { scheduled: sessions.length };
  } finally {
    isRescheduling = false;
  }
}

export async function disableAll(): Promise<void> {
  await clearScheduled();
}
