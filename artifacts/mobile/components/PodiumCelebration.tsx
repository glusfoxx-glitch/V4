import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { teamColor, type PodiumLatest, type PodiumEntry } from "@/lib/f1";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const POSITION_HEIGHTS: Record<number, number> = {
  1: 130,
  2: 95,
  3: 70,
};

const POSITION_COLORS: Record<number, [string, string]> = {
  1: ["#FACC15", "#A16207"],
  2: ["#E2E8F0", "#64748B"],
  3: ["#FB923C", "#9A3412"],
};

const POSITION_MEDALS: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

type Props = {
  data: PodiumLatest;
  visible: boolean;
  onClose: () => void;
};

export function PodiumCelebration({ data, visible, onClose }: Props) {
  const colors = useColors();

  useEffect(() => {
    if (visible && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  // Order: render P2 (left), P1 (center), P3 (right)
  const ordered = useMemo(() => {
    const byPos = new Map(data.podium.map((p) => [p.position, p]));
    return [byPos.get(2), byPos.get(1), byPos.get(3)].filter(
      Boolean,
    ) as PodiumEntry[];
  }, [data.podium]);

  const winner = data.podium.find((p) => p.position === 1);
  const sessionLabel = data.type === "sprint" ? "COURSE SPRINT" : "COURSE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Confetti />

        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={12}
          accessibilityLabel="Fermer"
        >
          <View style={styles.closeBtnInner}>
            <Feather name="x" size={20} color="#fff" />
          </View>
        </Pressable>

        <View style={styles.headerWrap}>
          <Animated.View
            entering={FadeIn.delay(150).duration(400)}
            style={styles.flagRow}
          >
            <Image
              source={{ uri: `https://flagcdn.com/w160/${data.countryCode}.png` }}
              style={styles.flag}
              contentFit="cover"
            />
            <View>
              <View style={[styles.sessionTypePill, data.type === "sprint" ? styles.sessionTypeSprint : styles.sessionTypeRace]}>
                <Text style={styles.eyebrow}>
                  PODIUM {sessionLabel}
                </Text>
              </View>
              <Text style={styles.gpName} numberOfLines={1}>
                {data.gpName}
              </Text>
            </View>
          </Animated.View>
        </View>

        {winner ? (
          <Animated.View
            entering={FadeIn.delay(550).duration(500)}
            style={styles.winnerBanner}
          >
            <LinearGradient
              colors={["#FACC15", "#F59E0B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.winnerGradient}
            >
              <Text style={styles.winnerLabel}>VAINQUEUR</Text>
              <Text style={styles.winnerName}>{winner.driver}</Text>
              <Text style={styles.winnerMeta}>
                #{winner.driverNumber ?? "—"} · {winner.team}
              </Text>
            </LinearGradient>
          </Animated.View>
        ) : null}

        <View style={styles.podiumRow}>
          {ordered.map((entry, idx) => (
            <PodiumStep
              key={entry.position}
              entry={entry}
              animationOrder={idx}
            />
          ))}
        </View>

        <Animated.View
          entering={FadeIn.delay(1300).duration(400)}
          style={styles.actions}
        >
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => {
              onClose();
              router.push(`/gp/${data.gpId}/${data.type}`);
            }}
          >
            <Text style={styles.primaryBtnText}>Voir les résultats complets</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.secondaryBtnText}>Fermer</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PodiumStep({
  entry,
  animationOrder,
}: {
  entry: PodiumEntry;
  animationOrder: number;
}) {
  const height = POSITION_HEIGHTS[entry.position];
  const [c1, c2] = POSITION_COLORS[entry.position];
  const teamHex = teamColor(entry.team);

  const stepAnim = useSharedValue(0);
  const photoScale = useSharedValue(0);

  useEffect(() => {
    const stagger = animationOrder * 220;
    stepAnim.value = withDelay(
      400 + stagger,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
    photoScale.value = withDelay(
      700 + stagger,
      withSpring(1, { damping: 10, stiffness: 110 }),
    );
  }, [animationOrder, stepAnim, photoScale]);

  const stepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - stepAnim.value) * 200,
      },
    ],
    opacity: stepAnim.value,
  }));

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
    opacity: photoScale.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: stepAnim.value,
    transform: [{ translateY: (1 - stepAnim.value) * 30 }],
  }));

  return (
    <View style={styles.stepCol}>
      <Animated.View style={[styles.photoWrap, photoStyle]}>
        {entry.photo ? (
          <Image
            source={{ uri: entry.photo }}
            style={styles.photo}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={[styles.photoFallback, { backgroundColor: teamHex }]}>
            <Text style={styles.photoFallbackText}>{entry.driverCode}</Text>
          </View>
        )}
        <View style={[styles.medal, { borderColor: c1 }]}>
          <Text style={styles.medalText}>{POSITION_MEDALS[entry.position]}</Text>
        </View>
      </Animated.View>

      <Animated.View style={cardStyle}>
        <Text style={styles.stepDriver} numberOfLines={1}>
          {entry.driver.split(" ").slice(-1)[0]}
        </Text>
        <View style={[styles.teamPill, { borderColor: teamHex }]}>
          <View style={[styles.teamDot, { backgroundColor: teamHex }]} />
          <Text style={styles.teamText} numberOfLines={1}>
            {entry.team}
          </Text>
        </View>
        <Text style={styles.timeText} numberOfLines={1}>
          {entry.position === 1 ? entry.time : entry.gap}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.step,
          { height, marginTop: 6 },
          stepStyle,
        ]}
      >
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.stepGradient}
        >
          <Text style={styles.stepNumber}>{entry.position}</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

function Confetti() {
  const pieces = useMemo(() => {
    const count = 28;
    const colors = [
      "#E10600",
      "#FACC15",
      "#22D3EE",
      "#A78BFA",
      "#34D399",
      "#FB7185",
      "#F97316",
    ];
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      left: Math.random() * SCREEN_W,
      delay: Math.random() * 800,
      duration: 1800 + Math.random() * 1500,
      size: 6 + Math.random() * 6,
      rotate: Math.random() * 360,
      color: colors[i % colors.length],
    }));
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece
          key={p.key}
          left={p.left}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
          rotate={p.rotate}
          color={p.color}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({
  left,
  delay,
  duration,
  size,
  rotate,
  color,
}: {
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
  color: string;
}) {
  const y = useSharedValue(-40);
  const r = useSharedValue(rotate);
  const sway = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(SCREEN_H + 40, {
        duration,
        easing: Easing.in(Easing.quad),
      }),
    );
    r.value = withDelay(
      delay,
      withTiming(rotate + 360 * 3, { duration }),
    );
    sway.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(20, { duration: 700 }),
          withTiming(-20, { duration: 700 }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(y);
      cancelAnimation(r);
      cancelAnimation(sway);
    };
  }, [y, r, sway, delay, duration, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: sway.value },
      { rotate: `${r.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left,
          top: 0,
          width: size,
          height: size * 0.5,
          backgroundColor: color,
          borderRadius: 1,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    minHeight: SCREEN_H,
    backgroundColor: "rgba(8,8,12,0.97)",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 36,
    paddingBottom: 24,
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 24,
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  flagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  flag: { width: 38, height: 28, borderRadius: 4 },
  sessionTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  sessionTypeRace: {
    backgroundColor: "#E10600",
  },
  sessionTypeSprint: {
    backgroundColor: "#7C3AED",
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  gpName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 2,
    maxWidth: SCREEN_W - 120,
  },
  winnerBanner: {
    marginTop: 14,
    alignItems: "center",
  },
  winnerGradient: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#FACC15",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  winnerLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
    color: "#1f1300",
  },
  winnerName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1f1300",
    marginTop: 2,
  },
  winnerMeta: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(31,19,0,0.85)",
    marginTop: 2,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
    maxWidth: 130,
  },
  photoWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    marginBottom: 8,
    position: "relative",
  },
  photo: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#1a1a1f",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  photoFallback: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  photoFallbackText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  medal: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0d0d0f",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: { fontSize: 14 },
  stepDriver: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
  },
  teamPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "center",
  },
  teamDot: { width: 5, height: 5, borderRadius: 3 },
  teamText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
    maxWidth: 80,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 6,
    textAlign: "center",
  },
  gapSubText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  step: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  stepGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "rgba(0,0,0,0.55)",
  },
  actions: {
    marginTop: "auto",
    paddingTop: 20,
    gap: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E10600",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
