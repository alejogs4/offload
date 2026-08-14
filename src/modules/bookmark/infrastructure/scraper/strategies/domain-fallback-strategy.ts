import { ExtractionContext, MetadataExtractorStrategy } from "../metadata-extractor-strategy";
import { ScrapedMetadata } from "../../../domain/metadata-scraper-port";

export class DomainFallbackStrategy implements MetadataExtractorStrategy {
  readonly name = "DomainFallbackStrategy";

  canExtract(): boolean {
    return true;
  }

  async extract(ctx: ExtractionContext): Promise<Partial<ScrapedMetadata>> {
    const parsedUrl = ctx.parsedUrl;
    const host = parsedUrl.hostname.replace(/^www\./, "");
    const path = parsedUrl.pathname.replace(/\/$/, "");

    if (host.includes("linkedin.com")) {
      const isProfile = path.includes("/in/");
      const profileName = isProfile ? path.split("/in/")[1]?.split("/")[0] : null;
      return {
        title: profileName ? `LinkedIn Profile (${profileName})` : "LinkedIn Page",
        description: `Profile/Page on ${parsedUrl.hostname}`,
      };
    }

    return {
      title: host || parsedUrl.hostname,
      description: `Page from ${parsedUrl.hostname}`,
    };
  }
}
