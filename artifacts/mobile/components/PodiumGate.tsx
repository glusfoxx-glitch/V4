import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";

import { fetchLatestPodium, type DriverStandings } from "@/lib/f1";
import { getLastSeenPodium, markPodiumSeen } from "@/lib/podiumSeen";

import { PodiumCelebration } from "./PodiumCelebration";

export function PodiumGate() {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["f1", "podium-latest"],
    queryFn: fetchLatestPodium,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const photoFallbacks = useMemo(() => {
    const standings = queryClient.getQueryData<DriverStandings>(["f1", "standings", "drivers"]);
    const map: Record<string, string> = {};
    for (const d of standings?.standings ?? []) {
      if (d.driverCode && d.photo) map[d.driverCode] = d.photo;
    }
    return map;
  }, [queryClient, visible]);

  useEffect(() => {
    if (!data || shown) return;
    if (data.podium.length < 3) return;
    if (data.type !== "race" && data.type !== "sprint") return;
    let cancelled = false;
    (async () => {
      const last = await getLastSeenPodium();
      if (cancelled) return;
      if (last !== data.key) {
        setVisible(true);
        setShown(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, shown]);

  if (!data) return null;

  return (
    <PodiumCelebration
      data={data}
      visible={visible}
      photoFallbacks={photoFallbacks}
      onClose={async () => {
        setVisible(false);
        await markPodiumSeen(data.key);
      }}
    />
  );
}
