import { MetadataScraperPort } from "../../domain/metadata-scraper-port";
import { MetadataExtractorStrategy } from "./metadata-extractor-strategy";
import { OEmbedStrategy } from "./strategies/oembed-strategy";
import { JsonLdStrategy } from "./strategies/json-ld-strategy";
import { OpenGraphStrategy } from "./strategies/opengraph-strategy";
import { HtmlFallbackStrategy } from "./strategies/html-fallback-strategy";
import { DomainFallbackStrategy } from "./strategies/domain-fallback-strategy";
import { PipelineMetadataScraper, PipelineScraperOptions } from "./pipeline-metadata-scraper";

export class MetadataScraperFactory {
  public static createDefault(
    options: PipelineScraperOptions = {},
    customStrategies: MetadataExtractorStrategy[] = []
  ): MetadataScraperPort {
    const strategies: MetadataExtractorStrategy[] = [
      ...customStrategies,
      new OEmbedStrategy(),
      new JsonLdStrategy(),
      new OpenGraphStrategy(),
      new HtmlFallbackStrategy(),
      new DomainFallbackStrategy(),
    ];

    return new PipelineMetadataScraper(strategies, options);
  }
}
