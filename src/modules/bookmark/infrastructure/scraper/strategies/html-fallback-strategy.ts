import { ExtractionContext, MetadataExtractorStrategy } from "../metadata-extractor-strategy";
import { ScrapedMetadata } from "../../../domain/metadata-scraper-port";

export class HtmlFallbackStrategy implements MetadataExtractorStrategy {
  readonly name = "HtmlFallbackStrategy";

  canExtract(): boolean {
    return true;
  }

  async extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata> | null> {
    const $ = await ctx.getDom();
    if (!$) return null;

    const htmlTitle = $("title").text().trim() || $("h1").first().text().trim();
    const firstParagraph = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .find((text) => text.length > 25 && !text.toLowerCase().includes("cookie"));

    if (htmlTitle || firstParagraph) {
      return {
        title: htmlTitle || undefined,
        description: firstParagraph || undefined,
      };
    }

    return null;
  }
}
