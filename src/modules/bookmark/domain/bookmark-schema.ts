import { z } from "zod";
import { BookmarkStatus, BookmarkStatusSchema } from "./bookmark-status";
import {
  DefaultTaxonomy,
  CategorySchema,
  SubcategorySchema,
  StandardTaxonomyCategories,
  StandardTaxonomyCategory,
} from "./bookmark-category";

export {
  BookmarkStatus,
  BookmarkStatusSchema,
  DefaultTaxonomy,
  CategorySchema,
  SubcategorySchema,
  StandardTaxonomyCategories,
};
export type { StandardTaxonomyCategory };

export const BookmarkIdSchema = z.string().uuid({ message: "Bookmark ID must be a valid UUID" });
export const UserIdSchema = z.string().min(1, { message: "User ID cannot be empty" });
export const UrlSchema = z.string().url({ message: "Invalid URL format" });
export const BookmarkTitleSchema = z.string().min(1, { message: "Title cannot be empty" }).max(500);

export const BookmarkDescriptionSchema = z
  .string()
  .nullish()
  .transform((val) => val ?? "")
  .default("");

export const OgImageSchema = z
  .string()
  .nullish()
  .transform((val) => (val && val.trim().length > 0 ? val.trim() : undefined))
  .optional();

export const BookmarkStateSchema = z.object({
  id: BookmarkIdSchema,
  userId: UserIdSchema,
  url: UrlSchema,
  title: BookmarkTitleSchema,
  description: BookmarkDescriptionSchema,
  ogImage: OgImageSchema,
  category: CategorySchema,
  subcategory: SubcategorySchema,
  status: BookmarkStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BookmarkState = z.infer<typeof BookmarkStateSchema>;
