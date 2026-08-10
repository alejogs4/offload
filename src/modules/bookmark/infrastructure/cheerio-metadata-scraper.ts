import * as cheerio from "cheerio";
import { MetadataScraperPort, ScrapedMetadata } from "../domain/metadata-scraper-port";

export class CheerioMetadataScraper implements MetadataScraperPort {
  async scrape(url: string): Promise<ScrapedMetadata> {
    try {
      const parsedUrl = new URL(url);
      const fallbackTitle = parsedUrl.hostname;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      if (!response.ok) {
        return {
          title: fallbackTitle,
          description: `Page from ${parsedUrl.hostname}`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text().trim() ||
        fallbackTitle;

      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        `Page from ${parsedUrl.hostname}`;

      const ogImage =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content");

      return {
        title,
        description,
        ogImage: ogImage || undefined,
      };
    } catch (err) {
      console.warn(`[MetadataScraper] Failed to scrape ${url}, using fallback:`, err);
      try {
        const parsed = new URL(url);
        return {
          title: parsed.hostname,
          description: `Link from ${parsed.hostname}`,
        };
      } catch {
        return {
          title: url,
          description: "Saved web link",
        };
      }
    }
  }
}
