import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  fetchSession,
  formatSessionTime,
  teamColor,
  type SessionResult,
  type SessionType,
} from "@/lib/f1";

export default function SessionScreen() {
  const { id, session } = useLocalSearchParams<{
    id: string;
    session: SessionType;
  }>();
  const colors = useColors();
  const { data, isLoading, error } = useQuery({
    queryKey: ["f1", "session", id, session],
    queryFn: () => fetchSession(id!, session!),
    enabled: !!id && !!session,
    refetchInterval: (query) => {
      const d = query.state.data as import("@/lib/f1").SessionDetail | null | undefined;
      if (d?.status === "completed" && (d?.results?.length ?? 0) === 0) return 15_000;
      return 30_000;
    },
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
        <Text style={{ color: colors.destructive }}>Session introuvable</Text>
      </View>
    );
  }

  const isUpcoming = data.status === "upcoming";
  const noResultsAvailable = !isUpcoming && !data.resultsAvailable;
  const showResults = !isUpcoming && data.resultsAvailable;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Stack.Screen options={{ title: data.label }} />

      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {data.gpName.toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {data.label}
        </Text>
        {data.date ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {formatSessionTime(data.date, data.time)}
          </Text>
        ) : null}
      </View>

      {isUpcoming ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Session pas encore disputée
          </Text>
          <Text
            style={[styles.emptySub, { color: colors.mutedForeground }]}
          >
            Les résultats apparaîtront ici une fois la session terminée.
          </Text>
        </View>
      ) : noResultsAvailable ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Pas de classement public
          </Text>
          <Text
            style={[styles.emptySub, { color: colors.mutedForeground }]}
          >
            Les essais libres et le Sprint Shootout n'ont pas de classement
            officiel publié via notre source de données.
          </Text>
        </View>
      ) : showResults && data.results.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Résultats en cours de publication
          </Text>
          <Text
            style={[styles.emptySub, { color: colors.mutedForeground }]}
          >
            La session vient de se terminer. Le classement sera disponible
            sous peu.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          <View
            style={[
              styles.headerRow,
              { borderColor: colors.border },
            ]}
          >
            <Text style={[styles.headerCellPos, { color: colors.mutedForeground }]}>
              POS
            </Text>
            <Text style={[styles.headerCellDriver, { color: colors.mutedForeground }]}>
              PILOTE
            </Text>
            <Text style={[styles.headerCellTime, { color: colors.mutedForeground }]}>
              {session === "race" ? "TEMPS / ÉCART" : "MEILLEUR TOUR"}
            </Text>
          </View>
          {data.results.map((r) => (
            <ResultRow
              key={r.position}
              result={r}
              isRace={session === "race"}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ResultRow({
  result,
  isRace,
}: {
  result: SessionResult;
  isRace: boolean;
}) {
  const colors = useColors();
  const podium = result.position <= 3;
  const teamHex = teamColor(result.team);

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.posCell}>
        <View
          style={[
            styles.posBadge,
            podium
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.secondary },
          ]}
        >
          <Text
            style={[
              styles.posText,
              { color: podium ? "#fff" : colors.foreground },
            ]}
          >
            {result.position}
          </Text>
        </View>
      </View>
      <View style={styles.driverCell}>
        <View style={[styles.teamBar, { backgroundColor: teamHex }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.driverName, { color: colors.foreground }]} numberOfLines={1}>
            {result.driver}
          </Text>
          <Text style={[styles.teamName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {result.team}
          </Text>
        </View>
      </View>
      <View style={styles.timeCell}>
        <Text style={[styles.timeText, { color: colors.foreground }]}>
          {result.time}
        </Text>
        {!isRace && result.position > 1 ? (
          <Text style={[styles.gapText, { color: colors.mutedForeground }]}>
            {result.gap}
          </Text>
        ) : null}
        {result.tyre ? (
          <Text style={[styles.tyreText, { color: colors.mutedForeground }]}>
            {result.tyre}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  headerCellPos: {
    width: 36,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  headerCellDriver: {
    flex: 1,
    paddingLeft: 12,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  headerCellTime: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    minWidth: 110,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  posCell: { width: 36, alignItems: "flex-start" },
  posBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  posText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  driverCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 6,
  },
  teamBar: { width: 3, height: 28, borderRadius: 2 },
  driverName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  teamName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  timeCell: { alignItems: "flex-end", minWidth: 110 },
  timeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  gapText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  tyreText: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2, letterSpacing: 0.5 },
  emptyCard: {
    margin: 20,
    padding: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
