import { MetadataScraperPort, ScrapedMetadata } from "../domain/metadata-scraper-port";
import { MetadataScraperFactory } from "./scraper/metadata-scraper-factory";

export class CheerioMetadataScraper implements MetadataScraperPort {
  private pipeline: MetadataScraperPort;

  constructor() {
    this.pipeline = MetadataScraperFactory.createDefault();
  }

  async scrape(url: string): Promise<ScrapedMetadata> {
    return this.pipeline.scrape(url);
  }
}
