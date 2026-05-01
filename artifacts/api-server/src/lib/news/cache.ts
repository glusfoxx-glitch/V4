import { logger } from "../logger.js";
import { fetchAndParse, type RawArticle } from "./parser.js";
import {
  isFluffTitle,
  matchesF1Keywords,
  NEWS_REFRESH_INTERVAL_MS,
  NEWS_START_DATE,
  NEWS_TTL_DAYS,
  SOURCES,
  type SourceId,
} from "./sources.js";
import { pruneTranslationCache, translateToFrench } from "./translator.js";

export type Article = {
  id: string;
  sourceId: SourceId;
  sourceName: string;
  brandColor: string;
  title: string;
  description: string;
  content?: string;
  link: string;
  image?: string;
  publishedAt: string;
};

let articles: Article[] = [];
let lastRefreshAt = 0;
let refreshInFlight: Promise<void> | null = null;

function shouldKeep(raw: RawArticle): boolean {
  if (raw.publishedAt < NEWS_START_DATE) return false;
  const ageMs = Date.now() - raw.publishedAt.getTime();
  if (ageMs > NEWS_TTL_DAYS * 24 * 60 * 60 * 1000) return false;
  if (raw.source.needsKeywordFilter) {
    if (!matchesF1Keywords(raw.title, raw.description, raw.content)) return false;
  }
  if (isFluffTitle(raw.title)) return false;
  return true;
}

async function buildArticle(raw: RawArticle): Promise<Article> {
  const [titleFr, descriptionFr, contentFr] = await Promise.all([
    translateToFrench(raw.title, raw.source.language),
    translateToFrench(raw.description, raw.source.language),
    translateToFrench(raw.content, raw.source.language),
  ]);
  return {
    id: raw.id,
    sourceId: raw.source.id,
    sourceName: raw.source.name,
    brandColor: raw.source.brandColor,
    title: titleFr ?? raw.title,
    description: descriptionFr ?? raw.description,
    content: contentFr,
    link: raw.link,
    image: raw.image,
    publishedAt: raw.publishedAt.toISOString(),
  };
}

async function doRefresh(): Promise<void> {
  const start = Date.now();
  const allRaw: RawArticle[] = [];
  for (const source of SOURCES) {
    const items = await fetchAndParse(source);
    allRaw.push(...items);
  }

  const filtered = allRaw.filter(shouldKeep);
  const seen = new Set<string>();
  const unique = filtered.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const built: Article[] = [];
  const concurrency = 4;
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(buildArticle));
    built.push(...results);
  }

  built.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  articles = built;
  lastRefreshAt = Date.now();
  pruneTranslationCache(NEWS_TTL_DAYS * 24 * 60 * 60 * 1000);

  logger.info(
    {
      durationMs: Date.now() - start,
      total: built.length,
      raw: allRaw.length,
    },
    "news refresh completed",
  );
}

export async function refreshNews(force = false): Promise<void> {
  if (refreshInFlight) {
    await refreshInFlight;
    return;
  }
  if (!force && Date.now() - lastRefreshAt < NEWS_REFRESH_INTERVAL_MS) return;
  refreshInFlight = doRefresh().catch((err) => {
    logger.error({ err }, "news refresh failed");
  });
  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function getArticles(): Article[] {
  return articles;
}

export function getArticleById(id: string): Article | undefined {
  return articles.find((a) => a.id === id);
}

export function getLastRefreshAt(): number {
  return lastRefreshAt;
}

export function startNewsScheduler(): void {
  void refreshNews(true);
  setInterval(() => {
    void refreshNews(true);
  }, NEWS_REFRESH_INTERVAL_MS).unref();
}
