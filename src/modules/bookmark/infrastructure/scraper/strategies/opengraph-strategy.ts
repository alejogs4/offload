import { ExtractionContext, MetadataExtractorStrategy } from "../metadata-extractor-strategy";
import { ScrapedMetadata } from "../../../domain/metadata-scraper-port";

export class OpenGraphStrategy implements MetadataExtractorStrategy {
  readonly name = "OpenGraphStrategy";

  canExtract(): boolean {
    return true;
  }

  async extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null> {
    const $ = await ctx.getDom();
    if (!$) return null;

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $('meta[name="title"]').attr("content");

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="summary"]').attr("content");

    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href");

    if (title || description || ogImage) {
      return {
        title: title ? title.trim() : undefined,
        description: description ? description.trim() : undefined,
        ogImage: ogImage ? ogImage.trim() : undefined,
      };
    }

    return null;
  }
}
