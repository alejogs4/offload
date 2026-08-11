export interface CategorizationPromptConfig {
  temperature: number;
  categoryDescription: string;
  subcategoryDescription: string;
  systemPrompt: string;
  formatUserPrompt: (title: string, description: string, url: string) => string;
}

export const categorizationPromptConfig: CategorizationPromptConfig = {
  temperature: 0.1,
  categoryDescription:
    "Broad top-level category in Title Case (e.g., Technology, Design, Business & Finance, Science, Productivity, Media)",
  subcategoryDescription:
    "Specific subcategory in Title Case (e.g., Artificial Intelligence, Frontend, UI & UX, Investing, Research)",
  systemPrompt: `You are a precise web content taxonomist. Your job is to classify bookmarked links into standard, concise categories and subcategories.

Taxonomy Guidelines:
1. Standardize names: Use clean Title Case (1-3 words max). Avoid generic noise like "tech" or "stuff".
2. Infer context from URL domain if title/description are brief or missing (e.g., github.com -> Technology / Open Source, arxiv.org -> Science / Papers, youtube.com -> Media / Video).
3. Ignore scraping noise: Ignore cookie banners, "404 Not Found", or bot challenge text in the title/description.
4. Consistency: Default to standard top-level categories such as Technology, Design, Business & Finance, Science & Research, Productivity, Media, or General.`,
  formatUserPrompt: (title: string, description: string, url: string) => `<bookmark>
Title: ${title.trim() || "N/A"}
Description: ${description.trim() || "N/A"}
URL: ${url.trim()}
</bookmark>`,
};
