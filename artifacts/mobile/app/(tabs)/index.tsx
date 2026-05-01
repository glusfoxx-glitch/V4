import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  fetchGrandsPrix,
  formatDateShort,
  type GPSummary,
} from "@/lib/f1";

export default function GrandsPrixScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["f1", "gps"],
    queryFn: fetchGrandsPrix,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.destructive }]}>
          {(error as Error).message}
        </Text>
      </View>
    );
  }

  const completed = data?.filter((g) => g.status === "completed").length ?? 0;
  const upcoming = (data?.length ?? 0) - completed;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
          gap: 12,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              FORMULA 1 · 2026
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Grands Prix
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {completed} terminés · {upcoming} à venir
            </Text>
          </View>
        }
        renderItem={({ item }) => <GPCard item={item} />}
      />
    </View>
  );
}

function GPCard({ item }: { item: GPSummary }) {
  const colors = useColors();
  const isUpcoming = item.status === "upcoming";

  return (
    <Link href={`/gp/${item.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: colors.primary }]} />
        <View style={[styles.imageWrap, { backgroundColor: "#fff" }]}>
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={styles.roundBadge}>
              <Text style={styles.roundLabel}>ROUND</Text>
              <Text style={styles.roundNumber}>
                {String(item.round).padStart(2, "0")}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                isUpcoming
                  ? { backgroundColor: "rgba(225,6,0,0.9)" }
                  : { backgroundColor: "rgba(22,163,74,0.9)" },
              ]}
            >
              <Text style={styles.statusText}>
                {isUpcoming ? "À VENIR" : "TERMINÉ"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text
              style={[styles.cardCountry, { color: colors.primary }]}
              numberOfLines={1}
            >
              {item.country.toUpperCase()}
            </Text>
            <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
              {formatDateShort(item.date)}
            </Text>
          </View>
          <Text
            style={[styles.cardTitle, { color: colors.cardForeground }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.cardMeta, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {item.circuit}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { fontSize: 14, paddingHorizontal: 24, textAlign: "center" },
  eyebrow: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: { fontSize: 32, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, marginTop: 4, fontFamily: "Inter_400Regular" },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  accent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    zIndex: 2,
  },
  imageWrap: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roundBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(13,13,15,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    minWidth: 56,
  },
  roundLabel: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    color: "#a1a1aa",
  },
  roundNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
    color: "#fff",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  cardBody: { padding: 16, gap: 6 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardCountry: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
