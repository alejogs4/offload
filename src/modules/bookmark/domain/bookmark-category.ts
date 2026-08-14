import { z } from "zod";

export const DefaultTaxonomy = {
  CATEGORY: "Uncategorized",
  SUBCATEGORY: "General",
} as const;

export const CategorySchema = z
  .string()
  .nullish()
  .transform((val) => (val && val.trim() ? val.trim() : DefaultTaxonomy.CATEGORY))
  .default(DefaultTaxonomy.CATEGORY);

export const SubcategorySchema = z
  .string()
  .nullish()
  .transform((val) => (val && val.trim() ? val.trim() : DefaultTaxonomy.SUBCATEGORY))
  .default(DefaultTaxonomy.SUBCATEGORY);

export const StandardTaxonomyCategories = {
  TECHNOLOGY: "Technology",
  DESIGN: "Design",
  BUSINESS_FINANCE: "Business & Finance",
  SCIENCE_RESEARCH: "Science & Research",
  PRODUCTIVITY: "Productivity",
  MEDIA: "Media",
  GENERAL: "General",
  UNCATEGORIZED: "Uncategorized",
} as const;

export type StandardTaxonomyCategory =
  (typeof StandardTaxonomyCategories)[keyof typeof StandardTaxonomyCategories];
