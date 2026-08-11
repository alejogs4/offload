import * as cheerio from "cheerio";
import { MetadataScraperPort, ScrapedMetadata } from "../domain/metadata-scraper-port";

export class CheerioMetadataScraper implements MetadataScraperPort {
  async scrape(url: string): Promise<ScrapedMetadata> {
    try {
      const parsedUrl = new URL(url);

      // 1. YouTube Special Handler via official oEmbed API
      if (parsedUrl.hostname.includes("youtube.com") || parsedUrl.hostname.includes("youtu.be")) {
        const ytMetadata = await this.scrapeYouTubeOEmbed(url);
        if (ytMetadata) return ytMetadata;
      }

      // 2. Fetch page HTML with standard web browser headers
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return this.createFallbackForDomain(parsedUrl);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // 3. JSON-LD Extraction
      const jsonLdMetadata = this.extractJsonLd($);

      // 4. OpenGraph & Twitter Card Meta Tags
      const ogTitle =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $('meta[name="title"]').attr("content");

      const ogDescription =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        $('meta[name="summary"]').attr("content");

      const ogImage =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        $('link[rel="image_src"]').attr("href");

      // 5. HTML Tags & Body Fallbacks
      const htmlTitle = $("title").text().trim() || $("h1").first().text().trim();
      const firstParagraph = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .find((text) => text.length > 25 && !text.toLowerCase().includes("cookie"));

      // Best effort metadata resolution
      let title = jsonLdMetadata?.title || ogTitle || htmlTitle || parsedUrl.hostname;
      let description =
        jsonLdMetadata?.description ||
        ogDescription ||
        firstParagraph ||
        `Page from ${parsedUrl.hostname}`;
      let image = jsonLdMetadata?.ogImage || ogImage;

      // Clean up title
      title = this.cleanTitle(title, parsedUrl.hostname);

      return {
        title,
        description,
        ogImage: image || undefined,
      };
    } catch (err) {
      console.warn(`[MetadataScraper] Failed to scrape ${url}, using fallback:`, err);
      try {
        return this.createFallbackForDomain(new URL(url));
      } catch {
        return {
          title: url,
          description: "Saved web link",
        };
      }
    }
  }

  private async scrapeYouTubeOEmbed(url: string): Promise<ScrapedMetadata | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const data = await res.json();

      const title = data.title ? `${data.title} - ${data.author_name || "YouTube"}` : undefined;
      const description = data.author_name ? `YouTube video by ${data.author_name}` : "YouTube video";
      const ogImage = data.thumbnail_url;

      if (title) {
        return { title, description, ogImage };
      }
    } catch {
      // Fall through to standard scraping
    }
    return null;
  }

  private extractJsonLd($: cheerio.CheerioAPI): Partial<ScrapedMetadata> | null {
    try {
      const scripts = $('script[type="application/ld+json"]').toArray();
      for (const script of scripts) {
        const text = $(script).html();
        if (!text) continue;
        const data = JSON.parse(text);
        const item = Array.isArray(data) ? data[0] : data;

        const title = item?.headline || item?.name;
        const description = item?.description || item?.abstract;
        const image = typeof item?.image === "string" ? item.image : item?.image?.url || item?.image?.[0];

        if (title || description) {
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

  private cleanTitle(title: string, hostname: string): string {
    let cleaned = title.trim();

    if (cleaned === "- YouTube" || cleaned === "YouTube") {
      return `YouTube Link (${hostname})`;
    }

    return cleaned || hostname;
  }

  private createFallbackForDomain(parsedUrl: URL): ScrapedMetadata {
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
      title: parsedUrl.hostname,
      description: `Page from ${parsedUrl.hostname}`,
    };
  }
}
