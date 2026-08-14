import { ExtractionContext, MetadataExtractorStrategy } from "../metadata-extractor-strategy";
import { ScrapedMetadata } from "../../../domain/metadata-scraper-port";

export class JsonLdStrategy implements MetadataExtractorStrategy {
  readonly name = "JsonLdStrategy";

  canExtract(): boolean {
    return true; // Checks DOM lazily
  }

  async extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null> {
    const $ = await ctx.getDom();
    if (!$) return null;

    try {
      const scripts = $('script[type="application/ld+json"]').toArray();
      for (const script of scripts) {
        const text = $(script).html();
        if (!text) continue;

        const data = JSON.parse(text);
        const item = Array.isArray(data) ? data[0] : data;

        const title = item?.headline || item?.name;
        const description = item?.description || item?.abstract;
        const image =
          typeof item?.image === "string"
            ? item.image
            : item?.image?.url || item?.image?.[0];

        if (title || description || image) {
          return {
            title: title ? String(title).trim() : undefined,
            description: description ? String(description).trim() : undefined,
            ogImage: image ? String(image) : undefined,
          };
        }
      }
    } catch {
      // Ignore JSON-LD parse errors
    }

    return null;
  }
}
