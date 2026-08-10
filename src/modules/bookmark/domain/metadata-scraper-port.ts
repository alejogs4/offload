export interface ScrapedMetadata {
  title: string;
  description: string;
  ogImage?: string;
}

export interface MetadataScraperPort {
  scrape(url: string): Promise<ScrapedMetadata>;
}
