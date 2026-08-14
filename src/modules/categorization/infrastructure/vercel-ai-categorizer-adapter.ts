import { generateObject, LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { CategorizerPort, CategorizationResult } from "../domain/categorizer-port";
import { categorizationPromptConfig } from "../domain/categorization-prompt-config";

import { DefaultTaxonomy } from "~/modules/bookmark/domain/bookmark-category";

export class VercelAiCategorizerAdapter implements CategorizerPort {
  async categorize(title: string, description: string, url: string): Promise<CategorizationResult> {
    const model = this.resolveLanguageModel();

    if (!model) {
      console.warn("[VercelAiCategorizer] No valid AI API key found (GEMINI_API_KEY or OPENAI_API_KEY). Using heuristic fallback.");
      return this.heuristicFallback(title, description, url);
    }

    const schema = z.object({
      category: z.string().describe(categorizationPromptConfig.categoryDescription),
      subcategory: z.string().describe(categorizationPromptConfig.subcategoryDescription),
    });

    try {
      const { object } = await generateObject({
        model,
        schema,
        system: categorizationPromptConfig.systemPrompt,
        prompt: categorizationPromptConfig.formatUserPrompt(title, description, url),
        temperature: categorizationPromptConfig.temperature,
      });

      return {
        category: object.category?.trim() || DefaultTaxonomy.CATEGORY,
        subcategory: object.subcategory?.trim() || DefaultTaxonomy.SUBCATEGORY,
      };
    } catch (err) {
      console.error("[VercelAiCategorizer] AI categorization failed, falling back:", err);
      return this.heuristicFallback(title, description, url);
    }
  }

  private resolveLanguageModel(): LanguageModel | null {
    const provider = (process.env.AI_PROVIDER || "auto").toLowerCase();
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Explicit Provider Selection
    if (provider === "openai" && openaiKey) {
      return openai("gpt-4o-mini");
    }

    if (provider === "google" && geminiKey) {
      return google("gemini-2.5-flash");
    }

    // Auto Resolution: prefer OpenAI if key exists, otherwise Gemini
    if (openaiKey) {
      return openai("gpt-4o-mini");
    }

    if (geminiKey) {
      return google("gemini-2.5-flash");
    }

    return null;
  }

  private heuristicFallback(title: string, description: string, url: string): CategorizationResult {
    const text = `${title} ${description} ${url}`.toLowerCase();

    if (text.includes("ai") || text.includes("llm") || text.includes("gpt") || text.includes("gemini")) {
      return { category: "Tech", subcategory: "Artificial Intelligence" };
    }
    if (text.includes("react") || text.includes("javascript") || text.includes("css") || text.includes("frontend")) {
      return { category: "Tech", subcategory: "Frontend Development" };
    }
    if (text.includes("design") || text.includes("figma") || text.includes("ui") || text.includes("ux")) {
      return { category: "Design", subcategory: "UI & UX" };
    }
    if (text.includes("money") || text.includes("stock") || text.includes("crypto") || text.includes("invest")) {
      return { category: "Finance", subcategory: "Investing" };
    }

    return { category: "General", subcategory: "Reading List" };
  }
}
