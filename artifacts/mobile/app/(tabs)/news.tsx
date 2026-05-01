import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchNews, formatRelativeTime, type NewsItem } from "@/lib/f1";

export default function NewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["f1", "news"],
    queryFn: fetchNews,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Chargement des actualités…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.destructive }]}>
          Impossible de charger les actualités
        </Text>
        <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
          {(error as Error).message}
        </Text>
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
          gap: 14,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              FORMULA 1 · ACTUALITÉS
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Actualités
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {items.length} article{items.length > 1 ? "s" : ""} · mise à jour automatique
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Feather name="inbox" size={42} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>
              Aucune actualité pour le moment
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <NewsCard item={item} featured={index === 0} />
        )}
      />
    </View>
  );
}

function NewsCard({ item, featured }: { item: NewsItem; featured: boolean }) {
  const colors = useColors();

  return (
    <Link href={`/news/${item.id}`} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[styles.image, featured && styles.imageFeatured]}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.image,
              featured && styles.imageFeatured,
              {
                backgroundColor: colors.muted,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Feather name="image" size={30} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <View
              style={[styles.sourcePill, { backgroundColor: item.brandColor }]}
            >
              <Text style={styles.sourcePillText}>{item.sourceName}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatRelativeTime(item.publishedAt)}
            </Text>
          </View>

          <Text
            style={[
              styles.cardTitle,
              { color: colors.foreground },
              featured && { fontSize: 20, lineHeight: 26 },
            ]}
            numberOfLines={featured ? 4 : 3}
          >
            {item.title}
          </Text>

          {item.description ? (
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
              numberOfLines={featured ? 4 : 2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontFamily: "Inter_500Medium" },
  error: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorSub: { fontSize: 13, marginTop: 6, fontFamily: "Inter_400Regular" },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    marginTop: 4,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: { marginTop: 4, fontSize: 13, fontFamily: "Inter_500Medium" },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: { width: "100%", height: 180, backgroundColor: "#222" },
  imageFeatured: { height: 240 },
  cardBody: { padding: 14, gap: 8 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourcePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourcePillText: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metaText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
