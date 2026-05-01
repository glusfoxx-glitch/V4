import { logger } from "../logger.js";

type CacheEntry = { fr: string; at: number };

const cache = new Map<string, CacheEntry>();

function cacheKey(sourceLang: string, text: string): string {
  return `${sourceLang}::${text}`;
}

async function translateGoogle(text: string, sourceLang: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const parts: string[] = [];
    for (const seg of data[0] as unknown[]) {
      if (Array.isArray(seg) && typeof seg[0] === "string") {
        parts.push(seg[0]);
      }
    }
    const out = parts.join("").trim();
    return out.length > 0 ? out : null;
  } catch (err) {
    logger.debug({ err }, "google translate failed");
    return null;
  }
}

async function translateMyMemory(text: string, sourceLang: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|fr`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const out = data?.responseData?.translatedText?.trim();
    return out && out.length > 0 ? out : null;
  } catch (err) {
    logger.debug({ err }, "mymemory translate failed");
    return null;
  }
}

const MAX_CHUNK = 4500;

function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).length > MAX_CHUNK && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + " " + s : s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export async function translateToFrench(
  text: string | undefined,
  sourceLang: "en" | "fr",
): Promise<string | undefined> {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (sourceLang === "fr") return trimmed;

  const key = cacheKey(sourceLang, trimmed);
  const cached = cache.get(key);
  if (cached) return cached.fr;

  const chunks = splitIntoChunks(trimmed);
  const translated: string[] = [];

  for (const chunk of chunks) {
    let out = await translateGoogle(chunk, sourceLang);
    if (!out) {
      out = await translateMyMemory(chunk, sourceLang);
    }
    if (!out) {
      return trimmed;
    }
    translated.push(out);
  }

  const final = translated.join(" ").trim();
  cache.set(key, { fr: final, at: Date.now() });
  return final;
}

export function pruneTranslationCache(maxAgeMs: number): void {
  const now = Date.now();
  let removed = 0;
  for (const [k, v] of cache.entries()) {
    if (now - v.at > maxAgeMs) {
      cache.delete(k);
      removed++;
    }
  }
  if (removed > 0) {
    logger.debug({ removed, remaining: cache.size }, "translation cache pruned");
  }
}

export function getTranslationCacheSize(): number {
  return cache.size;
}
