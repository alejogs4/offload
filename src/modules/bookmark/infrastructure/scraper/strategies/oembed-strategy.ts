import { ExtractionContext, MetadataExtractorStrategy } from "../metadata-extractor-strategy";
import { ScrapedMetadata } from "../../../domain/metadata-scraper-port";

export class OEmbedStrategy implements MetadataExtractorStrategy {
  readonly name = "OEmbedStrategy";

  canExtract(ctx: ExtractionContext): boolean {
    const host = ctx.parsedUrl.hostname.toLowerCase();
    return host.includes("youtube.com") || host.includes("youtu.be");
  }

  async extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(ctx.rawUrl)}&format=json`;
      const data = await ctx.fetchJson<{
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      }>(oembedUrl, 4000);

      if (!data) return null;

      const title = data.title
        ? `${data.title} - ${data.author_name || "YouTube"}`
        : undefined;
      const description = data.author_name
        ? `YouTube video by ${data.author_name}`
        : "YouTube video";
      const ogImage = data.thumbnail_url;

      if (title) {
        return {
          title: this.cleanTitle(title, ctx.parsedUrl.hostname),
          description,
          ogImage,
        };
      }
    } catch {
      // Fallback through strategy pipeline
    }

    return null;
  }

  private cleanTitle(title: string, hostname: string): string {
    const trimmed = title.trim();
    if (trimmed === "- YouTube" || trimmed === "YouTube") {
      return `YouTube Link (${hostname})`;
    }
    return trimmed || hostname;
  }
}
