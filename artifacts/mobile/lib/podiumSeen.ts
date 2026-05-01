import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@f1.lastSeenPodiumKey";

export async function getLastSeenPodium(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function markPodiumSeen(key: string): Promise<void> {
  await AsyncStorage.setItem(KEY, key);
}
