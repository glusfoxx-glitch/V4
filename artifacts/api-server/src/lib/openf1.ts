import { readFileSync, writeFileSync } from "fs";

type DriverInfo = {
  number: number;
  acronym: string;
  fullName: string;
  team: string;
  teamColour: string;
  headshotUrl: string;
};

type CacheEntry = { data: Map<string, DriverInfo>; expiresAt: number };
let driverCache: CacheEntry | null = null;

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const DRIVER_DISK_CACHE = "/tmp/f1-drivers-cache.json";

function loadDiskDriverCache(): Map<string, DriverInfo> | null {
  try {
    const raw = readFileSync(DRIVER_DISK_CACHE, "utf8");
    const entries = JSON.parse(raw) as [string, DriverInfo][];
    return new Map(entries);
  } catch {
    return null;
  }
}

function saveDiskDriverCache(map: Map<string, DriverInfo>): void {
  try {
    writeFileSync(DRIVER_DISK_CACHE, JSON.stringify([...map.entries()]));
  } catch {
    /* ignore write errors */
  }
}

async function loadDrivers(): Promise<Map<string, DriverInfo>> {
  const now = Date.now();
  if (driverCache && driverCache.expiresAt > now) return driverCache.data;

  try {
    const res = await fetch(
      "https://api.openf1.org/v1/drivers?session_key=latest",
      { headers: { "User-Agent": "F1Info/4.0" }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`OpenF1 ${res.status}`);
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) throw new Error("OpenF1 drivers: not an array");
    const rows = body as Array<{
      driver_number: number;
      name_acronym: string;
      full_name: string;
      team_name: string;
      team_colour: string;
      headshot_url: string;
    }>;

    const map = new Map<string, DriverInfo>();
    for (const r of rows) {
      if (!r.driver_number || !r.name_acronym) continue;
      const info: DriverInfo = {
        number: r.driver_number,
        acronym: r.name_acronym,
        fullName: r.full_name,
        team: r.team_name,
        teamColour: r.team_colour,
        headshotUrl: r.headshot_url,
      };
      map.set(r.name_acronym, info);
      map.set(String(r.driver_number), info);
    }
    driverCache = { data: map, expiresAt: now + ONE_HOUR };
    saveDiskDriverCache(map);
    return map;
  } catch {
    if (driverCache) return driverCache.data;
    const disk = loadDiskDriverCache();
    if (disk) {
      driverCache = { data: disk, expiresAt: now + FIVE_MIN };
      return disk;
    }
    return new Map();
  }
}

export async function driverPhoto(
  acronym?: string,
  number?: string,
): Promise<string | undefined> {
  if (!acronym && !number) return undefined;
  const map = await loadDrivers();
  const info =
    (acronym ? map.get(acronym) : undefined) ??
    (number ? map.get(number) : undefined);
  return info?.headshotUrl;
}

export async function driverInfo(
  acronym?: string,
  number?: string,
): Promise<DriverInfo | undefined> {
  if (!acronym && !number) return undefined;
  const map = await loadDrivers();
  return (
    (acronym ? map.get(acronym) : undefined) ??
    (number ? map.get(number) : undefined)
  );
}

type OpenF1Session = {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  year: number;
  date_start: string;
  date_end: string;
  circuit_short_name: string;
  country_name: string;
};

type OpenF1TimingRow = {
  driver_number: number;
  position: number;
  lap_time: string | null;
  lap_q1: string | null;
  lap_q2: string | null;
  lap_q3: string | null;
  date: string;
};

type OpenF1Lap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
  date_start: string;
};

type OpenF1Position = {
  date: string;
  driver_number: number;
  position: number;
  session_key: number;
};

type OpenF1Driver = {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  headshot_url: string;
};

export type FPResult = {
  position: number;
  driver: string;
  driverCode: string;
  team: string;
  time: string;
  gap: string;
  lapCount: number;
};

const sessionCache = new Map<string, { data: OpenF1Session[]; expiresAt: number }>();
const fpResultCache = new Map<number, { data: FPResult[]; expiresAt: number }>();
const sqResultCache = new Map<number, { data: FPResult[]; expiresAt: number }>();
const raceResultCache = new Map<number, { data: FPResult[]; expiresAt: number }>();

async function fetchOpenF1<T>(url: string, ttlMs: number, cacheKey: string, cacheMap: Map<string, { data: T; expiresAt: number }>): Promise<T> {
  const now = Date.now();
  const hit = cacheMap.get(cacheKey);
  if (hit && hit.expiresAt > now) return hit.data;

  const res = await fetch(url, {
    headers: { "User-Agent": "F1Info/4.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OpenF1 ${res.status} on ${url}`);
  const data = (await res.json()) as T;
  cacheMap.set(cacheKey, { data, expiresAt: now + ttlMs });
  return data;
}

async function getPracticeSessionKey(
  sessionDate: string,
  practiceNumber: 1 | 2 | 3,
): Promise<number | null> {
  const year = sessionDate.substring(0, 4);
  const sessionName = `Practice ${practiceNumber}`;

  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>(
      `https://api.openf1.org/v1/sessions?year=${year}&session_type=Practice`,
      ONE_HOUR,
      `sessions-${year}-practice`,
      sessionCache,
    );

    const targetDate = sessionDate.substring(0, 10);
    const match = sessions.find(
      (s) =>
        s.session_name === sessionName &&
        s.date_start.substring(0, 10) === targetDate,
    );
    return match?.session_key ?? null;
  } catch {
    return null;
  }
}

async function getSprintQualiSessionKey(
  sessionDate: string,
): Promise<number | null> {
  const year = sessionDate.substring(0, 4);
  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>(
      `https://api.openf1.org/v1/sessions?year=${year}&session_name=Sprint+Qualifying`,
      ONE_HOUR,
      `sessions-${year}-sprint-quali`,
      sessionCache,
    );
    const targetDate = sessionDate.substring(0, 10);
    const match = sessions.find(
      (s) => s.date_start.substring(0, 10) === targetDate,
    );
    return match?.session_key ?? null;
  } catch {
    return null;
  }
}

async function getQualifyingSessionKey(
  sessionDate: string,
): Promise<number | null> {
  const year = sessionDate.substring(0, 4);
  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>(
      `https://api.openf1.org/v1/sessions?year=${year}&session_name=Qualifying`,
      ONE_HOUR,
      `sessions-${year}-qualifying`,
      sessionCache,
    );
    const targetDate = sessionDate.substring(0, 10);
    const match = sessions.find(
      (s) => s.date_start.substring(0, 10) === targetDate,
    );
    return match?.session_key ?? null;
  } catch {
    return null;
  }
}

async function getRaceSessionKey(
  sessionDate: string,
  sessionName: "Race" | "Sprint",
): Promise<number | null> {
  const year = sessionDate.substring(0, 4);
  const cacheKey = `sessions-${year}-${sessionName.toLowerCase()}`;
  try {
    const sessions = await fetchOpenF1<OpenF1Session[]>(
      `https://api.openf1.org/v1/sessions?year=${year}&session_name=${sessionName}`,
      ONE_HOUR,
      cacheKey,
      sessionCache,
    );
    const targetDate = sessionDate.substring(0, 10);
    const match = sessions.find(
      (s) => s.date_start.substring(0, 10) === targetDate,
    );
    return match?.session_key ?? null;
  } catch {
    return null;
  }
}

function formatRaceTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const sStr = s.toFixed(3).padStart(6, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${sStr}`;
  return `${m}:${sStr}`;
}

export async function fetchRaceResultsOpenF1(
  sessionDate: string | undefined,
  sessionName: "Race" | "Sprint",
): Promise<FPResult[]> {
  if (!sessionDate) return [];

  const sessionKey = await getRaceSessionKey(sessionDate, sessionName);
  if (!sessionKey) return [];

  const cacheHit = raceResultCache.get(sessionKey);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  try {
    const [positions, laps, drivers] = await Promise.all([
      fetch(`https://api.openf1.org/v1/position?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(15000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 position ${r.status}`);
        return r.json() as Promise<OpenF1Position[]>;
      }),
      fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(20000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 laps ${r.status}`);
        return r.json() as Promise<OpenF1Lap[]>;
      }),
      fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(10000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 drivers ${r.status}`);
        return r.json() as Promise<OpenF1Driver[]>;
      }),
    ]);

    if (!Array.isArray(positions) || !Array.isArray(laps) || !Array.isArray(drivers)) return [];
    if (positions.length < 3) return [];

    // Final position per driver = last position entry
    const finalPositions = new Map<number, number>();
    for (const p of positions) {
      finalPositions.set(p.driver_number, p.position);
    }
    if (finalPositions.size < 3) return [];

    // Total race time + max lap per driver
    const lapData = new Map<number, { totalTime: number; maxLap: number }>();
    for (const lap of laps) {
      if (lap.lap_duration === null || lap.lap_duration === undefined) continue;
      const existing = lapData.get(lap.driver_number);
      if (!existing) {
        lapData.set(lap.driver_number, { totalTime: lap.lap_duration, maxLap: lap.lap_number });
      } else {
        existing.totalTime += lap.lap_duration;
        if (lap.lap_number > existing.maxLap) existing.maxLap = lap.lap_number;
      }
    }

    const driverMap = new Map<number, OpenF1Driver>();
    for (const d of drivers) driverMap.set(d.driver_number, d);

    const sorted = Array.from(finalPositions.entries()).sort(([, a], [, b]) => a - b);
    if (sorted.length < 3) return [];

    const [winnerNumber] = sorted[0];
    const winnerData = lapData.get(winnerNumber);
    const winnerMaxLap = winnerData?.maxLap ?? 0;
    const winnerTime = winnerData?.totalTime ?? null;

    const results: FPResult[] = sorted.map(([driverNumber, position], i) => {
      const d = driverMap.get(driverNumber);
      const driverData = lapData.get(driverNumber);
      const maxLap = driverData?.maxLap ?? 0;
      const totalTime = driverData?.totalTime ?? null;

      let time: string;
      let gap: string;
      if (i === 0) {
        time = totalTime !== null ? formatRaceTime(totalTime) : "—";
        gap = "—";
      } else if (maxLap < winnerMaxLap) {
        const diff = winnerMaxLap - maxLap;
        time = `+${diff} tour${diff > 1 ? "s" : ""}`;
        gap = time;
      } else if (totalTime !== null && winnerTime !== null) {
        const diff = totalTime - winnerTime;
        time = `+${diff.toFixed(3)}`;
        gap = time;
      } else {
        time = "—";
        gap = "—";
      }

      return {
        position,
        driver: d?.full_name ?? `#${driverNumber}`,
        driverCode: d?.name_acronym ?? String(driverNumber),
        team: d?.team_name ?? "—",
        time,
        gap,
        lapCount: maxLap,
      };
    });

    const now = Date.now();
    const sessionEndDate = new Date(sessionDate + "T23:59:59Z").getTime();
    const ttl = now > sessionEndDate + ONE_HOUR ? ONE_HOUR : FIVE_MIN;
    raceResultCache.set(sessionKey, { data: results, expiresAt: now + ttl });

    return results;
  } catch {
    return [];
  }
}

function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  const secsStr = secs.toFixed(3).padStart(6, "0");
  if (mins > 0) return `${mins}:${secsStr}`;
  return secsStr;
}

export async function fetchFPResults(
  sessionDate: string | undefined,
  practiceNumber: 1 | 2 | 3,
): Promise<FPResult[]> {
  if (!sessionDate) return [];

  const sessionKey = await getPracticeSessionKey(sessionDate, practiceNumber);
  if (!sessionKey) return [];

  const cacheHit = fpResultCache.get(sessionKey);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  try {
    const [laps, drivers] = await Promise.all([
      fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(15000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 laps ${r.status}`);
        return r.json() as Promise<OpenF1Lap[]>;
      }),
      fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(10000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 drivers ${r.status}`);
        return r.json() as Promise<OpenF1Driver[]>;
      }),
    ]);

    const driverMap = new Map<number, OpenF1Driver>();
    for (const d of drivers) {
      driverMap.set(d.driver_number, d);
    }

    const bestLapByDriver = new Map<number, { time: number; lapCount: number }>();
    for (const lap of laps) {
      if (!lap.lap_duration || lap.is_pit_out_lap) continue;
      const existing = bestLapByDriver.get(lap.driver_number);
      if (!existing) {
        bestLapByDriver.set(lap.driver_number, { time: lap.lap_duration, lapCount: 1 });
      } else {
        existing.lapCount++;
        if (lap.lap_duration < existing.time) {
          existing.time = lap.lap_duration;
        }
      }
    }

    const entries = Array.from(bestLapByDriver.entries())
      .filter(([, v]) => v.time > 0)
      .sort(([, a], [, b]) => a.time - b.time);

    const leaderTime = entries[0]?.[1]?.time ?? null;

    const results: FPResult[] = entries.map(([driverNumber, { time, lapCount }], i) => {
      const d = driverMap.get(driverNumber);
      const gap =
        i === 0 || leaderTime === null
          ? "—"
          : `+${(time - leaderTime).toFixed(3)}`;
      return {
        position: i + 1,
        driver: d?.full_name ?? `#${driverNumber}`,
        driverCode: d?.name_acronym ?? String(driverNumber),
        team: d?.team_name ?? "—",
        time: formatLapTime(time),
        gap,
        lapCount,
      };
    });

    const now = Date.now();
    const sessionEndDate = new Date(sessionDate + "T23:59:59Z").getTime();
    const ttl = now > sessionEndDate + ONE_HOUR ? ONE_HOUR : FIVE_MIN;
    fpResultCache.set(sessionKey, { data: results, expiresAt: now + ttl });

    return results;
  } catch {
    return [];
  }
}

export async function fetchQualifyingResultsOpenF1(
  sessionDate: string | undefined,
): Promise<FPResult[]> {
  if (!sessionDate) return [];

  const sessionKey = await getQualifyingSessionKey(sessionDate);
  if (!sessionKey) return [];

  const cacheHit = sqResultCache.get(sessionKey);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  try {
    const [laps, drivers] = await Promise.all([
      fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(15000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 laps ${r.status}`);
        return r.json() as Promise<OpenF1Lap[]>;
      }),
      fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(10000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 drivers ${r.status}`);
        return r.json() as Promise<OpenF1Driver[]>;
      }),
    ]);

    if (!Array.isArray(laps) || !Array.isArray(drivers)) return [];

    const driverMap = new Map<number, OpenF1Driver>();
    for (const d of drivers) driverMap.set(d.driver_number, d);

    const bestLapByDriver = new Map<number, { time: number; lapCount: number }>();
    for (const lap of laps) {
      if (!lap.lap_duration || lap.is_pit_out_lap) continue;
      const existing = bestLapByDriver.get(lap.driver_number);
      if (!existing) {
        bestLapByDriver.set(lap.driver_number, { time: lap.lap_duration, lapCount: 1 });
      } else {
        existing.lapCount++;
        if (lap.lap_duration < existing.time) existing.time = lap.lap_duration;
      }
    }

    if (bestLapByDriver.size < 3) return [];

    const entries = Array.from(bestLapByDriver.entries())
      .filter(([, v]) => v.time > 0)
      .sort(([, a], [, b]) => a.time - b.time);

    const leaderTime = entries[0]?.[1]?.time ?? null;

    const results: FPResult[] = entries.map(([driverNumber, { time, lapCount }], i) => {
      const d = driverMap.get(driverNumber);
      const gap = i === 0 || leaderTime === null ? "—" : `+${(time - leaderTime).toFixed(3)}`;
      return {
        position: i + 1,
        driver: d?.full_name ?? `#${driverNumber}`,
        driverCode: d?.name_acronym ?? String(driverNumber),
        team: d?.team_name ?? "—",
        time: formatLapTime(time),
        gap,
        lapCount,
      };
    });

    const now = Date.now();
    const sessionEndDate = new Date(sessionDate + "T23:59:59Z").getTime();
    const ttl = now > sessionEndDate + ONE_HOUR ? ONE_HOUR : FIVE_MIN;
    sqResultCache.set(sessionKey, { data: results, expiresAt: now + ttl });

    return results;
  } catch {
    return [];
  }
}

export async function fetchSprintQualiResults(
  sessionDate: string | undefined,
): Promise<FPResult[]> {
  if (!sessionDate) return [];

  const sessionKey = await getSprintQualiSessionKey(sessionDate);
  if (!sessionKey) return [];

  const cacheHit = sqResultCache.get(sessionKey);
  if (cacheHit && cacheHit.expiresAt > Date.now()) return cacheHit.data;

  try {
    const [laps, drivers] = await Promise.all([
      fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(15000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 laps ${r.status}`);
        return r.json() as Promise<OpenF1Lap[]>;
      }),
      fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, {
        headers: { "User-Agent": "F1Info/4.0" },
        signal: AbortSignal.timeout(10000),
      }).then((r) => {
        if (!r.ok) throw new Error(`OpenF1 drivers ${r.status}`);
        return r.json() as Promise<OpenF1Driver[]>;
      }),
    ]);

    const driverMap = new Map<number, OpenF1Driver>();
    for (const d of drivers) driverMap.set(d.driver_number, d);

    const bestLapByDriver = new Map<number, { time: number; lapCount: number }>();
    for (const lap of laps) {
      if (!lap.lap_duration || lap.is_pit_out_lap) continue;
      const existing = bestLapByDriver.get(lap.driver_number);
      if (!existing) {
        bestLapByDriver.set(lap.driver_number, { time: lap.lap_duration, lapCount: 1 });
      } else {
        existing.lapCount++;
        if (lap.lap_duration < existing.time) existing.time = lap.lap_duration;
      }
    }

    const entries = Array.from(bestLapByDriver.entries())
      .filter(([, v]) => v.time > 0)
      .sort(([, a], [, b]) => a.time - b.time);

    const leaderTime = entries[0]?.[1]?.time ?? null;

    const results: FPResult[] = entries.map(([driverNumber, { time, lapCount }], i) => {
      const d = driverMap.get(driverNumber);
      const gap = i === 0 || leaderTime === null ? "—" : `+${(time - leaderTime).toFixed(3)}`;
      return {
        position: i + 1,
        driver: d?.full_name ?? `#${driverNumber}`,
        driverCode: d?.name_acronym ?? String(driverNumber),
        team: d?.team_name ?? "—",
        time: formatLapTime(time),
        gap,
        lapCount,
      };
    });

    const now = Date.now();
    const sessionEndDate = new Date(sessionDate + "T23:59:59Z").getTime();
    const ttl = now > sessionEndDate + ONE_HOUR ? ONE_HOUR : FIVE_MIN;
    sqResultCache.set(sessionKey, { data: results, expiresAt: now + ttl });

    return results;
  } catch {
    return [];
  }
}
