import type { CheerioAPI } from "cheerio";
import { ScrapedMetadata } from "../../domain/metadata-scraper-port";

export interface ExtractionContext {
  rawUrl: string;
  parsedUrl: URL;
  getDom(): Promise<CheerioAPI | null>;
  fetchJson<T = any>(url: string, timeoutMs?: number): Promise<T | null>;
}

export interface MetadataExtractorStrategy {
  readonly name: string;
  canExtract(ctx: ExtractionContext): boolean;
  extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null>;
}
