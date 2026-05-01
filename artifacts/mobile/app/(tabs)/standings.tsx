import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  fetchConstructorStandings,
  fetchDriverStandings,
  teamColor,
  type ConstructorStanding,
  type DriverStanding,
} from "@/lib/f1";

type Tab = "drivers" | "constructors";

export default function StandingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("drivers");

  const drivers = useQuery({
    queryKey: ["f1", "standings", "drivers"],
    queryFn: fetchDriverStandings,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const constructors = useQuery({
    queryKey: ["f1", "standings", "constructors"],
    queryFn: fetchConstructorStandings,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const isLoading =
    tab === "drivers" ? drivers.isLoading : constructors.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          SAISON {drivers.data?.season ?? constructors.data?.season ?? "—"}
        </Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Classements
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Après {drivers.data?.round ?? constructors.data?.round ?? 0} manche
          {(drivers.data?.round ?? 0) > 1 ? "s" : ""}
        </Text>

        <View style={[styles.tabs, { backgroundColor: colors.card }]}>
          <TabButton
            label="Pilotes"
            active={tab === "drivers"}
            onPress={() => setTab("drivers")}
          />
          <TabButton
            label="Écuries"
            active={tab === "constructors"}
            onPress={() => setTab("constructors")}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === "drivers" ? (
        <FlatList
          data={drivers.data?.standings ?? []}
          keyExtractor={(r) => r.driverId}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 100,
          }}
          renderItem={({ item }) => <DriverRow row={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={constructors.data?.standings ?? []}
          keyExtractor={(r) => r.constructorId}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 100,
          }}
          renderItem={({ item }) => <ConstructorRow row={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabBtn,
        active && { backgroundColor: colors.primary },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.tabBtnText,
          { color: active ? "#fff" : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DriverRow({ row }: { row: DriverStanding }) {
  const colors = useColors();
  const teamHex = teamColor(row.team);
  const podium = row.position <= 3;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.posCol}>
        <Text
          style={[
            styles.posBig,
            { color: podium ? colors.primary : colors.foreground },
          ]}
        >
          {row.position}
        </Text>
      </View>

      <View style={[styles.teamBar, { backgroundColor: teamHex }]} />

      <View style={styles.photoCol}>
        {row.photo ? (
          <Image
            source={{ uri: row.photo }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.photoFallback, { backgroundColor: teamHex }]}>
            <Text style={styles.photoFallbackText}>{row.driverCode}</Text>
          </View>
        )}
        {row.driverNumber != null ? (
          <View
            style={[styles.numberBadge, { backgroundColor: teamHex }]}
          >
            <Text style={styles.numberBadgeText}>{row.driverNumber}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.nameCol}>
        <Text style={[styles.driverName, { color: colors.foreground }]} numberOfLines={1}>
          {row.driver}
        </Text>
        <Text style={[styles.team, { color: colors.mutedForeground }]} numberOfLines={1}>
          {row.team}
        </Text>
      </View>

      <View style={styles.statsCol}>
        <Text style={[styles.points, { color: colors.foreground }]}>
          {row.points}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>
          PTS
        </Text>
        {row.wins > 0 ? (
          <View style={[styles.winsPill, { backgroundColor: colors.primary }]}>
            <Text style={styles.winsText}>
              {row.wins} {row.wins > 1 ? "vict." : "vict."}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ConstructorRow({ row }: { row: ConstructorStanding }) {
  const colors = useColors();
  const teamHex = teamColor(row.team);
  const podium = row.position <= 3;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 18 },
      ]}
    >
      <View style={styles.posCol}>
        <Text
          style={[
            styles.posBig,
            { color: podium ? colors.primary : colors.foreground },
          ]}
        >
          {row.position}
        </Text>
      </View>

      <View style={[styles.teamBarBig, { backgroundColor: teamHex }]} />

      <View style={[styles.nameCol, { marginLeft: 12 }]}>
        <Text style={[styles.driverName, { color: colors.foreground, fontSize: 16 }]} numberOfLines={1}>
          {row.team}
        </Text>
        {row.wins > 0 ? (
          <Text style={[styles.team, { color: colors.mutedForeground }]}>
            {row.wins} victoire{row.wins > 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.statsCol}>
        <Text style={[styles.points, { color: colors.foreground, fontSize: 22 }]}>
          {row.points}
        </Text>
        <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>
          PTS
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  posCol: { width: 32, alignItems: "center" },
  posBig: { fontSize: 20, fontFamily: "Inter_700Bold" },
  teamBar: { width: 4, height: 50, borderRadius: 2 },
  teamBarBig: { width: 5, height: 36, borderRadius: 2.5 },
  photoCol: {
    width: 56,
    height: 56,
    position: "relative",
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a1a1f",
  },
  photoFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  numberBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0d0d0f",
  },
  numberBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  nameCol: { flex: 1, marginLeft: 4 },
  driverName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  team: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsCol: { alignItems: "flex-end", minWidth: 64, gap: 2 },
  points: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 22 },
  pointsLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  winsPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  winsText: {
    fontSize: 9,
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
