import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchNewsItem, formatRelativeTime } from "@/lib/f1";

export default function NewsDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["f1", "news", id],
    queryFn: () => fetchNewsItem(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Article" }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Article" }} />
        <Feather name="alert-triangle" size={42} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>
          Article introuvable
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          Cet article n'est plus disponible
        </Text>
      </View>
    );
  }

  const openOriginal = () => {
    WebBrowser.openBrowserAsync(data.link).catch(() => {});
  };

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: data.sourceName,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {data.image ? (
          <Image
            source={{ uri: data.image }}
            style={styles.heroImage}
            contentFit="cover"
            transition={250}
          />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: colors.muted }]} />
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View
              style={[styles.sourcePill, { backgroundColor: data.brandColor }]}
            >
              <Text style={styles.sourcePillText}>{data.sourceName}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatRelativeTime(data.publishedAt)}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {data.title}
          </Text>

          {data.description && data.description !== data.content ? (
            <Text style={[styles.lead, { color: colors.foreground }]}>
              {data.description}
            </Text>
          ) : null}

          {data.content ? (
            <Text style={[styles.content, { color: colors.foreground }]}>
              {data.content}
            </Text>
          ) : (
            <Text style={[styles.content, { color: colors.mutedForeground }]}>
              Cet article ne contient qu'un aperçu. Ouvre-le sur le site pour
              tout lire.
            </Text>
          )}

          <Pressable
            onPress={openOriginal}
            style={({ pressed }) => [
              styles.linkButton,
              {
                backgroundColor: data.brandColor,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="external-link" size={16} color="#fff" />
            <Text style={styles.linkButtonText}>Lire sur {data.sourceName}</Text>
          </Pressable>

          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            Article traduit automatiquement depuis l'anglais
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  errorSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  heroImage: {
    width: "100%",
    height: 260,
  },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourcePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sourcePillText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  lead: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 24,
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  linkButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});
