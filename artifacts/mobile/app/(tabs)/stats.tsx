import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchStats } from "@/lib/f1";
import {
  disableAll,
  ensurePermission,
  getNotificationsEnabled,
  rescheduleAll,
  setNotificationsEnabled,
} from "@/lib/notifications";

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["f1", "stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    (async () => {
      setNotifOn(await getNotificationsEnabled());
    })();
  }, []);

  const toggleNotif = async (next: boolean) => {
    setNotifBusy(true);
    setNotifMsg(null);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    try {
      if (next) {
        const ok = await ensurePermission();
        if (!ok) {
          setNotifMsg(
            Platform.OS === "web"
              ? "Les notifications sont disponibles uniquement dans l'app installée."
              : "Permission refusée. Activez les notifications dans les réglages.",
          );
          setNotifBusy(false);
          return;
        }
        const r = await rescheduleAll();
        await setNotificationsEnabled(true);
        setNotifOn(true);
        setNotifMsg(`${r.scheduled} session${r.scheduled > 1 ? "s" : ""} planifiée${r.scheduled > 1 ? "s" : ""}.`);
      } else {
        await disableAll();
        await setNotificationsEnabled(false);
        setNotifOn(false);
        setNotifMsg("Notifications désactivées.");
      }
    } catch (e) {
      setNotifMsg("Une erreur est survenue.");
    } finally {
      setNotifBusy(false);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>
        SAISON {data.season}
      </Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Stats</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Manche {data.currentRound} sur {data.totalRaces} ·{" "}
        {data.racesCompleted} disputée{data.racesCompleted > 1 ? "s" : ""}
      </Text>

      {data.nextGP ? (
        <Pressable
          onPress={() => router.push(`/gp/${data.nextGP!.id}`)}
          style={({ pressed }) => [
            styles.nextCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Image
            source={{
              uri: `https://flagcdn.com/w320/${data.nextGP.countryCode}.png`,
            }}
            style={styles.nextFlag}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.nextEyebrow, { color: colors.primary }]}>
              PROCHAIN GP · DANS {data.nextGP.daysUntil} JOUR
              {data.nextGP.daysUntil > 1 ? "S" : ""}
            </Text>
            <Text style={[styles.nextName, { color: colors.foreground }]}>
              {data.nextGP.name}
            </Text>
            <Text style={[styles.nextSub, { color: colors.mutedForeground }]}>
              {data.nextGP.country}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      ) : null}

      <View style={styles.grid}>
        {data.driversLeader ? (
          <BigCard
            eyebrow="LEADER PILOTES"
            title={data.driversLeader.name}
            value={`${data.driversLeader.points} pts`}
            sub={
              data.driversLeader.lead > 0
                ? `+${data.driversLeader.lead} pts d'avance`
                : "À égalité"
            }
            accent={colors.primary}
            icon="user"
          />
        ) : null}
        {data.constructorsLeader ? (
          <BigCard
            eyebrow="LEADER ÉCURIES"
            title={data.constructorsLeader.team}
            value={`${data.constructorsLeader.points} pts`}
            sub={
              data.constructorsLeader.lead > 0
                ? `+${data.constructorsLeader.lead} pts d'avance`
                : "À égalité"
            }
            accent="#FACC15"
            icon="award"
          />
        ) : null}
      </View>

      <View style={styles.gridSmall}>
        <SmallCard
          icon="calendar"
          label="Manches restantes"
          value={`${data.racesRemaining}`}
        />
        <SmallCard
          icon="users"
          label="Vainqueurs uniques"
          value={`${data.uniqueWinners}`}
        />
        <SmallCard
          icon="bar-chart-2"
          label="Points distribués"
          value={`${Math.round(data.totalPointsAwarded)}`}
        />
        <SmallCard
          icon="grid"
          label="Pilotes / Écuries"
          value={`${data.totalDrivers} / ${data.totalTeams}`}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Notifications
      </Text>
      <View
        style={[
          styles.notifCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.notifTitle, { color: colors.foreground }]}>
            Début et fin de session
          </Text>
          <Text
            style={[styles.notifSub, { color: colors.mutedForeground }]}
          >
            Recevez une alerte au démarrage de chaque session et à la fin pour
            consulter les résultats.
          </Text>
          {notifMsg ? (
            <Text style={[styles.notifMsg, { color: colors.primary }]}>
              {notifMsg}
            </Text>
          ) : null}
        </View>
        <Switch
          value={notifOn}
          onValueChange={toggleNotif}
          disabled={notifBusy}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
      {Platform.OS === "web" ? (
        <Text style={[styles.notifFootnote, { color: colors.mutedForeground }]}>
          Les notifications fonctionnent uniquement dans l'application
          téléchargée sur votre téléphone.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function BigCard({
  eyebrow,
  title,
  value,
  sub,
  accent,
  icon,
}: {
  eyebrow: string;
  title: string;
  value: string;
  sub: string;
  accent: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bigCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: accent }]}>
        <Feather name={icon} size={14} color="#fff" />
      </View>
      <Text style={[styles.bigEyebrow, { color: accent }]}>{eyebrow}</Text>
      <Text style={[styles.bigTitle, { color: colors.foreground }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.bigValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
        {sub}
      </Text>
    </View>
  );
}

function SmallCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.smallCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <Text style={[styles.smallValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 34 },
  sub: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 16 },
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: "hidden",
  },
  nextFlag: {
    width: 64,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#1a1a1f",
  },
  nextEyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  nextName: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  nextSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  gridSmall: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  bigCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 130,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bigEyebrow: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  bigTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bigValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  bigSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  smallCard: {
    width: "47%",
    flexGrow: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  smallValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  smallLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notifTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  notifSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 17,
  },
  notifMsg: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 8 },
  notifFootnote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
    lineHeight: 16,
    fontStyle: "italic",
  },
});
