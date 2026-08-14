import { describe, it, expect, vi } from "vitest";
import * as cheerio from "cheerio";
import { OEmbedStrategy } from "../strategies/oembed-strategy";
import { JsonLdStrategy } from "../strategies/json-ld-strategy";
import { OpenGraphStrategy } from "../strategies/opengraph-strategy";
import { HtmlFallbackStrategy } from "../strategies/html-fallback-strategy";
import { DomainFallbackStrategy } from "../strategies/domain-fallback-strategy";
import { PipelineMetadataScraper } from "../pipeline-metadata-scraper";
import { ExtractionContext } from "../metadata-extractor-strategy";

describe("Metadata Scraper Strategy Architecture", () => {
  function createMockContext(
    url: string,
    html?: string,
    jsonData?: any
  ): ExtractionContext {
    const parsedUrl = new URL(url);
    const dom = html ? cheerio.load(html) : null;

    return {
      rawUrl: url,
      parsedUrl,
      getDom: async () => dom,
      fetchJson: async () => jsonData ?? null,
    };
  }

  describe("OEmbedStrategy", () => {
    const strategy = new OEmbedStrategy();

    it("should recognize YouTube URLs", () => {
      const ytCtx = createMockContext("https://www.youtube.com/watch?v=123");
      const regularCtx = createMockContext("https://example.com");

      expect(strategy.canExtract(ytCtx)).toBe(true);
      expect(strategy.canExtract(regularCtx)).toBe(false);
    });

    it("should extract title, description, and thumbnail from oEmbed JSON", async () => {
      const ctx = createMockContext(
        "https://www.youtube.com/watch?v=123",
        undefined,
        {
          title: "Learn TypeScript in 50 Minutes",
          author_name: "Tech Channel",
          thumbnail_url: "https://img.youtube.com/vi/123/hqdefault.jpg",
        }
      );

      const result = await strategy.extract(ctx);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Learn TypeScript in 50 Minutes - Tech Channel");
      expect(result?.description).toBe("YouTube video by Tech Channel");
      expect(result?.ogImage).toBe("https://img.youtube.com/vi/123/hqdefault.jpg");
    });
  });

  describe("JsonLdStrategy", () => {
    const strategy = new JsonLdStrategy();

    it("should extract headline, description, and image from JSON-LD script", async () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "NewsArticle",
                "headline": "AI Breakthrough Announced",
                "description": "Researchers achieve new milestone.",
                "image": "https://example.com/ai.png"
              }
            </script>
          </head>
        </html>
      `;

      const ctx = createMockContext("https://news.example.com/ai", html);
      const result = await strategy.extract(ctx);

      expect(result?.title).toBe("AI Breakthrough Announced");
      expect(result?.description).toBe("Researchers achieve new milestone.");
      expect(result?.ogImage).toBe("https://example.com/ai.png");
    });
  });

  describe("OpenGraphStrategy", () => {
    const strategy = new OpenGraphStrategy();

    it("should extract open graph and twitter tags", async () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OpenGraph Title" />
            <meta property="og:description" content="OpenGraph Description" />
            <meta property="og:image" content="https://example.com/og.jpg" />
          </head>
        </html>
      `;

      const ctx = createMockContext("https://example.com/post", html);
      const result = await strategy.extract(ctx);

      expect(result?.title).toBe("OpenGraph Title");
      expect(result?.description).toBe("OpenGraph Description");
      expect(result?.ogImage).toBe("https://example.com/og.jpg");
    });
  });

  describe("HtmlFallbackStrategy", () => {
    const strategy = new HtmlFallbackStrategy();

    it("should extract title and first significant paragraph", async () => {
      const html = `
        <html>
          <head><title>Simple Page Title</title></head>
          <body>
            <h1>Main Heading</h1>
            <p>This is a detailed article explaining the inner workings of compiler architectures.</p>
          </body>
        </html>
      `;

      const ctx = createMockContext("https://example.com/blog", html);
      const result = await strategy.extract(ctx);

      expect(result?.title).toBe("Simple Page Title");
      expect(result?.description).toContain("compiler architectures");
    });
  });

  describe("DomainFallbackStrategy", () => {
    const strategy = new DomainFallbackStrategy();

    it("should generate clean fallback title and description from URL", async () => {
      const ctx = createMockContext("https://techblog.com/posts/2026/my-post");
      const result = await strategy.extract(ctx);

      expect(result.title).toBe("techblog.com");
      expect(result.description).toBe("Page from techblog.com");
    });

    it("should generate specialized title for LinkedIn profiles", async () => {
      const ctx = createMockContext("https://www.linkedin.com/in/johndoe");
      const result = await strategy.extract(ctx);

      expect(result.title).toBe("LinkedIn Profile (johndoe)");
    });
  });

  describe("PipelineMetadataScraper Integration", () => {
    it("should merge partial results from multiple strategies", async () => {
      const strategyA = {
        name: "StrategyA",
        canExtract: () => true,
        extract: async () => ({ title: "Title from A" }),
      };

      const strategyB = {
        name: "StrategyB",
        canExtract: () => true,
        extract: async () => ({ description: "Description from B", ogImage: "https://example.com/img.png" }),
      };

      const pipeline = new PipelineMetadataScraper([strategyA, strategyB]);
      const result = await pipeline.scrape("https://example.com");

      expect(result.title).toBe("Title from A");
      expect(result.description).toBe("Description from B");
      expect(result.ogImage).toBe("https://example.com/img.png");
    });
  });
});
