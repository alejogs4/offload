import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import { DefaultTaxonomy } from "~/modules/bookmark/domain/bookmark-category";

export const bookmarksTable = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  ogImage: text("og_image"),
  category: text("category").notNull().default(DefaultTaxonomy.CATEGORY),
  subcategory: text("subcategory").notNull().default(DefaultTaxonomy.SUBCATEGORY),
  status: text("status", {
    enum: [BookmarkStatus.PENDING, BookmarkStatus.VISITED],
  })
    .notNull()
    .default(BookmarkStatus.PENDING),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type BookmarkSelect = typeof bookmarksTable.$inferSelect;
export type BookmarkInsert = typeof bookmarksTable.$inferInsert;
