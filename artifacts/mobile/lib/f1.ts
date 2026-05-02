export const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export type SessionType =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint_quali"
  | "qualifying"
  | "sprint"
  | "race";

export type GPSummary = {
  id: string;
  round: number;
  date: string;
  time?: string;
  name: string;
  circuit: string;
  locality?: string;
  country: string;
  countryCode: string;
  image: string;
  status: "completed" | "upcoming";
};

export type GPSession = {
  type: SessionType;
  label: string;
  date?: string;
  time?: string;
  status: "completed" | "upcoming";
  resultsAvailable: boolean;
};

export type GPDetail = GPSummary & {
  sessions: GPSession[];
};

export type SessionResult = {
  position: number;
  driver: string;
  driverCode: string;
  team: string;
  time: string;
  gap: string;
  tyre?: string;
};

export type SessionDetail = {
  type: SessionType;
  label: string;
  gpId: string;
  gpName: string;
  countryCode: string;
  status: "completed" | "upcoming";
  resultsAvailable: boolean;
  date?: string;
  time?: string;
  results: SessionResult[];
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json() as Promise<T>;
}

export const fetchGrandsPrix = () => getJson<GPSummary[]>("/api/f1/gps");

export const fetchGrandPrix = (id: string) =>
  getJson<GPDetail | null>(`/api/f1/gps/${id}`);

export const fetchSession = (id: string, type: SessionType) =>
  getJson<SessionDetail | null>(`/api/f1/gps/${id}/sessions/${type}`);

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

export type DriverStandings = {
  season: string;
  round: number;
  standings: DriverStanding[];
};

export type ConstructorStandings = {
  season: string;
  round: number;
  standings: ConstructorStanding[];
};

export type SeasonStats = {
  season: string;
  currentRound: number;
  totalRaces: number;
  racesCompleted: number;
  racesRemaining: number;
  driversLeader: { name: string; code?: string; points: number; lead: number } | null;
  constructorsLeader: { team: string; points: number; lead: number } | null;
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

export type PodiumEntry = {
  position: number;
  driver: string;
  driverCode: string;
  driverNumber: number | null;
  team: string;
  time: string;
  gap: string;
  photo?: string;
};

export type PodiumLatest = {
  type: "race" | "sprint";
  label: string;
  gpId: string;
  gpName: string;
  country: string;
  countryCode: string;
  date: string;
  key: string;
  podium: PodiumEntry[];
};

export type UpcomingSession = {
  gpId: string;
  gpName: string;
  country: string;
  type: SessionType;
  label: string;
  startIso: string;
};

export const fetchDriverStandings = () =>
  getJson<DriverStandings>("/api/f1/standings/drivers");

export const fetchConstructorStandings = () =>
  getJson<ConstructorStandings>("/api/f1/standings/constructors");

export const fetchStats = () => getJson<SeasonStats>("/api/f1/stats");

export const fetchLatestPodium = () =>
  getJson<PodiumLatest | null>("/api/f1/podium/latest");

export const fetchUpcomingSessions = () =>
  getJson<UpcomingSession[]>("/api/f1/upcoming-sessions");

export type NewsItem = {
  id: string;
  sourceId: "f1" | "racingnews365" | "motorsport" | "jeremf1";
  sourceName: string;
  brandColor: string;
  title: string;
  description: string;
  content?: string;
  link: string;
  image?: string;
  publishedAt: string;
};

export type NewsResponse = {
  items: NewsItem[];
  lastRefreshAt: string;
};

export const fetchNews = () => getJson<NewsResponse>("/api/f1/news");
export const fetchNewsItem = (id: string) =>
  getJson<NewsItem>(`/api/f1/news/${id}`);

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  return formatDateLong(iso);
}

const TEAM_COLORS: Record<string, string> = {
  "Red Bull": "#1E40AF",
  McLaren: "#F97316",
  Ferrari: "#DC2626",
  Mercedes: "#14B8A6",
  "Aston Martin": "#0F766E",
  Alpine: "#2563EB",
  "Alpine F1 Team": "#2563EB",
  Williams: "#0EA5E9",
  "Racing Bulls": "#1D4ED8",
  "RB F1 Team": "#1D4ED8",
  Sauber: "#16A34A",
  Audi: "#E11D48",
  Haas: "#A1A1AA",
  "Haas F1 Team": "#A1A1AA",
  "Cadillac F1 Team": "#FACC15",
};

export function teamColor(team: string): string {
  return TEAM_COLORS[team] ?? "#71717A";
}

const MONTHS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatSessionTime(date?: string, time?: string): string {
  if (!date) return "";
  if (!time) return formatDateShort(date);
  const d = new Date(`${date}T${time}`);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDateShort(date)} · ${hh}h${mm}`;
}
