import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const bookmarksTable = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  ogImage: text("og_image"),
  category: text("category").notNull().default("Uncategorized"),
  subcategory: text("subcategory").notNull().default("General"),
  status: text("status", { enum: ["pending", "visited"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type BookmarkSelect = typeof bookmarksTable.$inferSelect;
export type BookmarkInsert = typeof bookmarksTable.$inferInsert;
