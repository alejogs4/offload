import { eq } from "drizzle-orm";
import { db } from "~/shared/infrastructure/db/client";
import { bookmarksTable } from "~/shared/infrastructure/db/schema";
import { Bookmark } from "../domain/bookmark";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";

export class DrizzleBookmarkRepository implements BookmarkRepositoryPort {
  async findById(id: string): Promise<Bookmark | null> {
    const rows = await db.select().from(bookmarksTable).where(eq(bookmarksTable.id, id)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    return new Bookmark({
      id: row.id,
      userId: row.userId,
      url: row.url,
      title: row.title,
      description: row.description,
      ogImage: row.ogImage || undefined,
      category: row.category,
      subcategory: row.subcategory,
      status: row.status as "pending" | "visited",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async save(bookmark: Bookmark): Promise<void> {
    const json = bookmark.toJSON();
    await db.insert(bookmarksTable).values({
      id: json.id,
      userId: json.userId,
      url: json.url,
      title: json.title,
      description: json.description,
      ogImage: json.ogImage,
      category: json.category,
      subcategory: json.subcategory,
      status: json.status,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    });
  }

  async update(bookmark: Bookmark): Promise<void> {
    const json = bookmark.toJSON();
    await db
      .update(bookmarksTable)
      .set({
        title: json.title,
        description: json.description,
        ogImage: json.ogImage,
        category: json.category,
        subcategory: json.subcategory,
        status: json.status,
        updatedAt: json.updatedAt,
      })
      .where(eq(bookmarksTable.id, json.id));
  }

  async findAllByUserId(userId: string): Promise<Bookmark[]> {
    const rows = await db.select().from(bookmarksTable).where(eq(bookmarksTable.userId, userId));
    return rows.map(
      (row) =>
        new Bookmark({
          id: row.id,
          userId: row.userId,
          url: row.url,
          title: row.title,
          description: row.description,
          ogImage: row.ogImage || undefined,
          category: row.category,
          subcategory: row.subcategory,
          status: row.status as "pending" | "visited",
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })
    );
  }
}
