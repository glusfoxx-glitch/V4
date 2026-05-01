import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  fetchGrandPrix,
  formatDateLong,
  formatSessionTime,
  type GPSession,
} from "@/lib/f1";

export default function GPDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { data, isLoading, error } = useQuery({
    queryKey: ["f1", "gp", id],
    queryFn: () => fetchGrandPrix(id!),
    enabled: !!id,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "" }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Introuvable" }} />
        <Text style={{ color: colors.destructive }}>
          Grand Prix introuvable
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Stack.Screen options={{ title: data.country }} />

      <View style={styles.heroWrap}>
        <Image
          source={{ uri: data.image }}
          style={styles.hero}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.roundBadge}>
              <Text style={styles.roundLabel}>ROUND</Text>
              <Text style={styles.roundNumber}>
                {String(data.round).padStart(2, "0")}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                data.status === "upcoming"
                  ? { backgroundColor: "rgba(225,6,0,0.9)" }
                  : { backgroundColor: "rgba(22,163,74,0.9)" },
              ]}
            >
              <Text style={styles.statusText}>
                {data.status === "upcoming" ? "À VENIR" : "TERMINÉ"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.headerBlock}>
        <Text style={[styles.country, { color: colors.primary }]}>
          {data.country.toUpperCase()}
        </Text>
        <Text style={[styles.gpName, { color: colors.foreground }]}>
          {data.name}
        </Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {data.circuit}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {formatDateLong(data.date)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Sessions
        </Text>
        <View style={{ gap: 10 }}>
          {data.sessions.map((s) => (
            <SessionRow key={s.type} gpId={data.id} session={s} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SessionRow({ gpId, session }: { gpId: string; session: GPSession }) {
  const colors = useColors();
  const isCompleted = session.status === "completed";
  const hasResults = isCompleted && session.resultsAvailable;
  const completedNoResults = isCompleted && !session.resultsAvailable;

  let statusText: string;
  let statusColor: string;
  if (hasResults) {
    statusText = "Résultats disponibles";
    statusColor = "#16A34A";
  } else if (completedNoResults) {
    statusText = "Session terminée";
    statusColor = colors.mutedForeground;
  } else {
    statusText = formatSessionTime(session.date, session.time) || "À venir";
    statusColor = colors.mutedForeground;
  }

  return (
    <Pressable
      onPress={() => router.push(`/gp/${gpId}/${session.type}`)}
      style={({ pressed }) => [
        styles.sessionRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
        <View style={styles.sessionLeft}>
          <View
            style={[
              styles.sessionIcon,
              {
                backgroundColor: hasResults
                  ? colors.primary
                  : colors.secondary,
              },
            ]}
          >
            <Feather
              name={iconForSession(session.type)}
              size={16}
              color={hasResults ? "#fff" : colors.mutedForeground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionLabel, { color: colors.foreground }]}>
              {session.label}
            </Text>
            <Text style={[styles.sessionStatus, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

function iconForSession(
  type: GPSession["type"],
): React.ComponentProps<typeof Feather>["name"] {
  switch (type) {
    case "race":
      return "flag";
    case "sprint":
      return "zap";
    case "sprint_quali":
      return "target";
    case "qualifying":
      return "clock";
    default:
      return "activity";
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroWrap: {
    height: 200,
    width: "100%",
    backgroundColor: "#fff",
    position: "relative",
  },
  hero: { width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    padding: 16,
    justifyContent: "flex-end",
  },
  heroBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  roundBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(13,13,15,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    minWidth: 64,
  },
  roundLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    color: "#a1a1aa",
  },
  roundNumber: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
    color: "#fff",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 6,
  },
  country: {
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  gpName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meta: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  sessionStatus: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
