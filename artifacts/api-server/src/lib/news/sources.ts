export type SourceId = "racingnews365" | "motorsport" | "jeremf1";

export type NewsSource = {
  id: SourceId;
  name: string;
  feedUrl: string;
  feedType: "rss" | "atom";
  language: "en" | "fr";
  needsKeywordFilter: boolean;
  brandColor: string;
  homeUrl: string;
};

export const SOURCES: NewsSource[] = [
  {
    id: "racingnews365",
    name: "RacingNews365",
    feedUrl: "https://racingnews365.com/feed/news.rss",
    feedType: "rss",
    language: "en",
    needsKeywordFilter: false,
    brandColor: "#1B6BE3",
    homeUrl: "https://racingnews365.com/",
  },
  {
    id: "motorsport",
    name: "Motorsport.com",
    feedUrl: "https://www.motorsport.com/rss/f1/news/",
    feedType: "rss",
    language: "en",
    needsKeywordFilter: false,
    brandColor: "#F26522",
    homeUrl: "https://www.motorsport.com/f1/",
  },
  {
    id: "jeremf1",
    name: "JérémF1",
    feedUrl:
      "https://www.youtube.com/feeds/videos.xml?channel_id=UCqt8DT1p1pCLPwbEoWsuJAA",
    feedType: "atom",
    language: "fr",
    needsKeywordFilter: true,
    brandColor: "#FF0000",
    homeUrl: "https://www.youtube.com/@JeremF1",
  },
];

export const F1_KEYWORDS = [
  "f1",
  "formule 1",
  "formula 1",
  "formula1",
  "grand prix",
  "gp ",
  "fia",
  "verstappen",
  "hamilton",
  "leclerc",
  "norris",
  "piastri",
  "russell",
  "alonso",
  "sainz",
  "stroll",
  "ocon",
  "gasly",
  "antonelli",
  "bortoleto",
  "tsunoda",
  "albon",
  "lawson",
  "hadjar",
  "bearman",
  "hulkenberg",
  "ferrari",
  "mercedes",
  "red bull",
  "redbull",
  "mclaren",
  "alpine",
  "williams",
  "sauber",
  "audi",
  "haas",
  "racing bulls",
  "aston martin",
  "kick sauber",
  "pole position",
  "podium",
  "qualif",
  "essais libres",
  "course",
  "circuit",
  "écurie",
  "ecurie",
  "pilote f1",
  "monoplace",
  "pirelli",
];

export function matchesF1Keywords(...texts: (string | undefined)[]): boolean {
  const blob = texts
    .filter((t): t is string => !!t)
    .join(" ")
    .toLowerCase();
  return F1_KEYWORDS.some((k) => blob.includes(k));
}

const FLUFF_TITLE_PATTERNS: RegExp[] = [
  /^\s*\d+\s+(?:things|reasons|ways|moments|times|drivers|tracks|cars|races|of\s+the|key|biggest|best|coolest|greatest|famous|iconic|memorable|surprising|underrated|forgotten|unbelievable)/i,
  /\b(?:ranked|listicle|the\s+best\s+of|top\s+\d+)\b/i,
  /\b(?:throwback|flashback|on\s+this\s+day|this\s+day\s+in|cult\s+heroes?|in\s+memory\s+of|remembering|tribute\s+to|all[-\s]?time|history\s+of|legends\s+of|classic\s+moments?)\b/i,
  /\b(?:could\s+have\s+played\s+out|might\s+have\s+been|what\s+if|alternative\s+history|hypothetical)\b/i,
  /\b(?:odds\s+(?:on|update|for)|betting|bookmakers?|bet\s+on)\b/i,
  /^\s*quiz:/i,
  /\b(?:lifestyle|fashion|gear\s+guide|gift\s+guide|playlist)\b/i,
  /\b(?:poll:|reader\s+poll|vote\s+now)\b/i,
  /\b(?:goodwood\s+revival|historic\s+racing|vintage\s+racing|24\s+hours?\s+of\s+(?:le\s+mans|nurburgring|spa|daytona))\b/i,
];

const OFFTOPIC_PATTERNS: RegExp[] = [
  /\b(?:formula\s*e|nascar|indycar|wrc|motogp|wec\b|le\s+mans|dakar)\b/i,
];

export function isFluffTitle(title: string): boolean {
  if (!title) return false;
  if (FLUFF_TITLE_PATTERNS.some((re) => re.test(title))) return true;
  if (OFFTOPIC_PATTERNS.some((re) => re.test(title))) return true;
  return false;
}

export const NEWS_START_DATE = new Date("2026-04-20T00:00:00Z");
export const NEWS_TTL_DAYS = 30;
export const NEWS_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
