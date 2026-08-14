import * as cheerio from "cheerio";
import { MetadataScraperPort, ScrapedMetadata } from "../../domain/metadata-scraper-port";
import { ExtractionContext, MetadataExtractorStrategy } from "./metadata-extractor-strategy";

export interface PipelineScraperOptions {
  timeoutMs?: number;
  userAgent?: string;
}

export class PipelineMetadataScraper implements MetadataScraperPort {
  private strategies: MetadataExtractorStrategy[];
  private options: PipelineScraperOptions;

  constructor(
    strategies: MetadataExtractorStrategy[],
    options: PipelineScraperOptions = {}
  ) {
    this.strategies = strategies;
    this.options = {
      timeoutMs: options.timeoutMs ?? 6000,
      userAgent:
        options.userAgent ??
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    };
  }

  async scrape(url: string): Promise<ScrapedMetadata> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return {
        title: url,
        description: "Saved web link",
      };
    }

    const context = this.createContext(url, parsedUrl);

    let title: string | undefined;
    let description: string | undefined;
    let ogImage: string | undefined;

    for (const strategy of this.strategies) {
      if (!strategy.canExtract(context)) {
        continue;
      }

      try {
        const result = await strategy.extract(context);
        if (result) {
          if (!title && result.title) {
            title = result.title;
          }
          if (!description && result.description) {
            description = result.description;
          }
          if (!ogImage && result.ogImage) {
            ogImage = result.ogImage;
          }

          // If all 3 fields are satisfied, we can stop early
          if (title && description && ogImage) {
            break;
          }
        }
      } catch (err) {
        console.warn(`[PipelineMetadataScraper] Strategy ${strategy.name} failed:`, err);
      }
    }

    // Ensure fallback minimums
    const finalTitle = title?.trim() || parsedUrl.hostname;
    const finalDescription = description?.trim() || `Page from ${parsedUrl.hostname}`;

    return {
      title: finalTitle,
      description: finalDescription,
      ogImage: ogImage || undefined,
    };
  }

  private createContext(rawUrl: string, parsedUrl: URL): ExtractionContext {
    let cachedDom: cheerio.CheerioAPI | null = null;
    let fetchAttempted = false;

    return {
      rawUrl,
      parsedUrl,

      getDom: async () => {
        if (cachedDom) return cachedDom;
        if (fetchAttempted) return null;

        fetchAttempted = true;
        try {
          const res = await fetch(rawUrl, {
            headers: {
              "User-Agent": this.options.userAgent!,
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
            },
            signal: AbortSignal.timeout(this.options.timeoutMs!),
          });

          if (!res.ok) return null;
          const html = await res.text();
          cachedDom = cheerio.load(html);
          return cachedDom;
        } catch {
          return null;
        }
      },

      fetchJson: async <T>(fetchUrl: string, timeoutMs = 4000): Promise<T | null> => {
        try {
          const res = await fetch(fetchUrl, {
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!res.ok) return null;
          return (await res.json()) as T;
        } catch {
          return null;
        }
      },
    };
  }
}
