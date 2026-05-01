import { XMLParser } from "fast-xml-parser";
import { logger } from "../logger.js";
import type { NewsSource } from "./sources.js";

export type RawArticle = {
  id: string;
  source: NewsSource;
  title: string;
  description: string;
  content?: string;
  link: string;
  image?: string;
  publishedAt: Date;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  cdataPropName: "__cdata",
});

function takeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(takeText).filter(Boolean).join(" ").trim();
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj["#text"] === "string") return (obj["#text"] as string).trim();
    if (typeof obj["__cdata"] === "string") return (obj["__cdata"] as string).trim();
    if (typeof obj["@_url"] === "string") return (obj["@_url"] as string).trim();
    if (typeof obj["@_href"] === "string") return (obj["@_href"] as string).trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function extractImage(html: string): string | undefined {
  if (!html) return undefined;
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  const enclosure = html.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) return enclosure[1];
  return undefined;
}

function parseDate(s: string | undefined, fallbackToNow = false): Date {
  if (!s) return fallbackToNow ? new Date() : new Date(0);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return fallbackToNow ? new Date() : new Date(0);
  return d;
}

function makeStableId(source: string, link: string): string {
  const buf = Buffer.from(`${source}::${link}`, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function parseRssChannel(channel: Record<string, unknown>, source: NewsSource): RawArticle[] {
  const items = channel["item"];
  const list = Array.isArray(items) ? items : items ? [items] : [];
  const out: RawArticle[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const link = takeText(item["link"]);
    if (!link) continue;
    const title = takeText(item["title"]);
    if (!title) continue;
    const descriptionHtml = takeText(item["description"]);
    const contentEncoded = takeText(item["content:encoded"]);
    const fullHtml = contentEncoded || descriptionHtml;
    const image =
      takeText((item["media:content"] as Record<string, unknown>)?.["@_url"]) ||
      takeText((item["media:thumbnail"] as Record<string, unknown>)?.["@_url"]) ||
      takeText((item["enclosure"] as Record<string, unknown>)?.["@_url"]) ||
      extractImage(fullHtml);

    out.push({
      id: makeStableId(source.id, link),
      source,
      title: stripHtml(title),
      description: stripHtml(descriptionHtml).slice(0, 500),
      content: contentEncoded ? stripHtml(contentEncoded) : undefined,
      link,
      image,
      publishedAt: parseDate(
        takeText(item["pubDate"]) || takeText(item["dc:date"]),
        true,
      ),
    });
  }
  return out;
}

function parseAtomFeed(feed: Record<string, unknown>, source: NewsSource): RawArticle[] {
  const entries = feed["entry"];
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  const out: RawArticle[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const linkRaw = item["link"];
    let link = "";
    if (Array.isArray(linkRaw)) {
      const first = linkRaw[0] as Record<string, unknown> | undefined;
      link = takeText(first?.["@_href"]) || takeText(first);
    } else if (linkRaw && typeof linkRaw === "object") {
      link = takeText((linkRaw as Record<string, unknown>)["@_href"]);
    } else {
      link = takeText(linkRaw);
    }
    if (!link) continue;
    const title = takeText(item["title"]);
    if (!title) continue;
    const summary = takeText(item["summary"]) || takeText(item["content"]);
    const mediaGroup = item["media:group"] as Record<string, unknown> | undefined;
    let image: string | undefined;
    if (mediaGroup) {
      const thumb = mediaGroup["media:thumbnail"];
      if (Array.isArray(thumb)) {
        image = takeText((thumb[0] as Record<string, unknown>)?.["@_url"]);
      } else if (thumb && typeof thumb === "object") {
        image = takeText((thumb as Record<string, unknown>)["@_url"]);
      }
    }
    out.push({
      id: makeStableId(source.id, link),
      source,
      title: stripHtml(title),
      description: stripHtml(summary).slice(0, 500),
      content: summary ? stripHtml(summary) : undefined,
      link,
      image,
      publishedAt: parseDate(takeText(item["published"]) || takeText(item["updated"])),
    });
  }
  return out;
}

export async function fetchAndParse(source: NewsSource): Promise<RawArticle[]> {
  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; F1NewsAggregator/1.0)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      logger.warn({ source: source.id, status: res.status }, "feed fetch non-200");
      return [];
    }
    const xml = await res.text();
    const parsed = xmlParser.parse(xml) as Record<string, unknown>;

    if (source.feedType === "atom") {
      const feed = parsed["feed"] as Record<string, unknown> | undefined;
      if (!feed) return [];
      return parseAtomFeed(feed, source);
    }

    const rss = parsed["rss"] as Record<string, unknown> | undefined;
    const channel = rss?.["channel"] as Record<string, unknown> | undefined;
    if (!channel) return [];
    return parseRssChannel(channel, source);
  } catch (err) {
    logger.warn({ source: source.id, err }, "failed to fetch/parse feed");
    return [];
  }
}
