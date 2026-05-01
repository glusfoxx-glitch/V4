const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const protocol = domain.startsWith("localhost") ? "http" : "https";
export const API_BASE = `${protocol}://${domain}/api/f1`;

async function apiFetch<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export type GPSummary = {
  id: string;
  round: number;
  date: string;
  time?: string;
  name: string;
  circuit: string;
  locality: string;
  country: string;
  countryCode: string;
  image: string;
  status: "completed" | "upcoming";
};

export type SessionSummary = {
  type: string;
  label: string;
  date?: string;
  time?: string;
  status: "completed" | "upcoming";
  resultsAvailable: boolean;
};

export type GPDetail = GPSummary & { sessions: SessionSummary[] };

export type ResultRow = {
  position: number;
  driver: string;
  driverCode: string;
  team: string;
  time: string;
  gap: string;
  lapCount?: number;
};

export type SessionResult = {
  type: string;
  label: string;
  gpId: string;
  gpName: string;
  countryCode: string;
  status: string;
  resultsAvailable: boolean;
  date?: string;
  time?: string;
  results: ResultRow[];
};

export type DriverStanding = {
  position: number;
  driverId: string;
  driver: string;
  driverCode: string;
  driverNumber: number | null;
  team: string;
  points: number;
  wins: number;
  photo?: string;
};

export type ConstructorStanding = {
  position: number;
  constructorId: string;
  team: string;
  points: number;
  wins: number;
};

export type StandingsResponse<T> = {
  season: string;
  round: number;
  standings: T[];
};

export type StatsSummary = {
  season: string;
  currentRound: number;
  totalRaces: number;
  racesCompleted: number;
  racesRemaining: number;
  driversLeader: {
    name: string;
    code?: string;
    points: number;
    lead: number;
  } | null;
  constructorsLeader: {
    team: string;
    points: number;
    lead: number;
  } | null;
  uniqueWinners: number;
  totalDrivers: number;
  totalTeams: number;
  totalPointsAwarded: number;
  nextGP: {
    id: string;
    name: string;
    country: string;
    countryCode: string;
    date: string;
    time?: string;
    daysUntil: number;
  } | null;
};

export type PodiumData = {
  type: "race" | "qualifying";
  label: string;
  gpId: string;
  gpName: string;
  country: string;
  countryCode: string;
  date: string;
  key: string;
  podium: Array<{
    position: number;
    driver: string;
    driverCode: string;
    driverNumber: number | null;
    team: string;
    time: string;
    gap: string;
    photo?: string;
  }>;
};

export type ArticleSummary = {
  id: string;
  sourceId: string;
  sourceName: string;
  brandColor: string;
  title: string;
  description: string;
  link: string;
  image?: string;
  publishedAt: string;
};

export type NewsResponse = {
  items: ArticleSummary[];
  lastRefreshAt: string;
};

export const f1Api = {
  gps: () => apiFetch<GPSummary[]>("/gps"),
  gp: (id: string) => apiFetch<GPDetail | null>(`/gps/${id}`),
  session: (gpId: string, type: string) =>
    apiFetch<SessionResult | null>(`/gps/${gpId}/sessions/${type}`),
  driverStandings: () =>
    apiFetch<StandingsResponse<DriverStanding>>("/standings/drivers"),
  constructorStandings: () =>
    apiFetch<StandingsResponse<ConstructorStanding>>("/standings/constructors"),
  stats: () => apiFetch<StatsSummary>("/stats"),
  latestPodium: () => apiFetch<PodiumData | null>("/podium/latest"),
  news: () =>
    apiFetch<NewsResponse>("/news").then((r) => r.items),
};
