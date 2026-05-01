const BASE = "https://api.jolpi.ca/ergast/f1";

export type SessionSlot = { date: string; time?: string };

export type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  url?: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { country: string; locality: string };
  };
  date: string;
  time?: string;
  FirstPractice?: SessionSlot;
  SecondPractice?: SessionSlot;
  ThirdPractice?: SessionSlot;
  Qualifying?: SessionSlot;
  Sprint?: SessionSlot;
  SprintQualifying?: SessionSlot;
};

export type JolpicaResultRow = {
  number: string;
  position: string;
  positionText?: string;
  points?: string;
  Driver: {
    driverId: string;
    code?: string;
    givenName: string;
    familyName: string;
  };
  Constructor: { constructorId: string; name: string };
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time: string };
  FastestLap?: {
    rank?: string;
    Time?: { time: string };
  };
  Q1?: string;
  Q2?: string;
  Q3?: string;
};

type CacheEntry<T> = { data: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cachedFetch<T>(url: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.data;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "F1Info/3.0 (Replit)" },
    });
    if (!res.ok) throw new Error(`Jolpica ${res.status} on ${url}`);
    const data = (await res.json()) as T;
    cache.set(url, { data, expiresAt: now + ttlMs });
    return data;
  } catch (err) {
    if (hit) return hit.data;
    throw err;
  }
}

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

export async function fetchSeason(): Promise<JolpicaRace[]> {
  const json = await cachedFetch<{
    MRData: { RaceTable: { Races: JolpicaRace[] } };
  }>(`${BASE}/current.json?limit=30`, ONE_HOUR);
  return json.MRData.RaceTable.Races;
}

export async function fetchRace(round: string): Promise<JolpicaRace | null> {
  const races = await fetchSeason();
  return races.find((r) => r.round === round) ?? null;
}

export async function fetchRaceResults(round: string): Promise<JolpicaResultRow[]> {
  const json = await cachedFetch<{
    MRData: { RaceTable: { Races: { Results?: JolpicaResultRow[] }[] } };
  }>(`${BASE}/current/${round}/results.json?limit=30`, ONE_MIN);
  return json.MRData.RaceTable.Races[0]?.Results ?? [];
}

export async function fetchQualifyingResults(round: string): Promise<JolpicaResultRow[]> {
  const json = await cachedFetch<{
    MRData: { RaceTable: { Races: { QualifyingResults?: JolpicaResultRow[] }[] } };
  }>(`${BASE}/current/${round}/qualifying.json?limit=30`, ONE_MIN);
  return json.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
}

export async function fetchSprintResults(round: string): Promise<JolpicaResultRow[]> {
  const json = await cachedFetch<{
    MRData: { RaceTable: { Races: { SprintResults?: JolpicaResultRow[] }[] } };
  }>(`${BASE}/current/${round}/sprint.json?limit=30`, ONE_MIN);
  return json.MRData.RaceTable.Races[0]?.SprintResults ?? [];
}

export type DriverStandingRow = {
  position: string;
  positionText?: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    code?: string;
    permanentNumber?: string;
    givenName: string;
    familyName: string;
  };
  Constructors: { constructorId: string; name: string }[];
};

export type ConstructorStandingRow = {
  position: string;
  positionText?: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string };
};

export async function fetchDriverStandings(): Promise<{
  season: string;
  round: string;
  rows: DriverStandingRow[];
}> {
  const json = await cachedFetch<{
    MRData: {
      StandingsTable: {
        StandingsLists: {
          season: string;
          round: string;
          DriverStandings: DriverStandingRow[];
        }[];
      };
    };
  }>(`${BASE}/current/driverStandings.json?limit=50`, FIVE_MIN);
  const list = json.MRData.StandingsTable.StandingsLists[0];
  return {
    season: list?.season ?? "",
    round: list?.round ?? "",
    rows: list?.DriverStandings ?? [],
  };
}

export async function fetchConstructorStandings(): Promise<{
  season: string;
  round: string;
  rows: ConstructorStandingRow[];
}> {
  const json = await cachedFetch<{
    MRData: {
      StandingsTable: {
        StandingsLists: {
          season: string;
          round: string;
          ConstructorStandings: ConstructorStandingRow[];
        }[];
      };
    };
  }>(`${BASE}/current/constructorStandings.json?limit=20`, FIVE_MIN);
  const list = json.MRData.StandingsTable.StandingsLists[0];
  return {
    season: list?.season ?? "",
    round: list?.round ?? "",
    rows: list?.ConstructorStandings ?? [],
  };
}

const COUNTRY_CODES: Record<string, string> = {
  Australia: "au",
  China: "cn",
  Japan: "jp",
  Bahrain: "bh",
  "Saudi Arabia": "sa",
  USA: "us",
  "United States": "us",
  Italy: "it",
  Monaco: "mc",
  Spain: "es",
  Canada: "ca",
  Austria: "at",
  UK: "gb",
  "United Kingdom": "gb",
  Hungary: "hu",
  Belgium: "be",
  Netherlands: "nl",
  Singapore: "sg",
  Mexico: "mx",
  Brazil: "br",
  Azerbaijan: "az",
  Qatar: "qa",
  UAE: "ae",
  "United Arab Emirates": "ae",
};

export function countryCode(country: string): string {
  return COUNTRY_CODES[country] ?? "un";
}
