import { eq } from "drizzle-orm";
import { db } from "~/shared/infrastructure/db/client";
import { bookmarksTable } from "~/shared/infrastructure/db/schema";
import { BookmarkState, BookmarkStateSchema } from "../domain/bookmark-schema";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";

export class DrizzleBookmarkRepository implements BookmarkRepositoryPort {
  async findById(id: string): Promise<BookmarkState | null> {
    const rows = await db.select().from(bookmarksTable).where(eq(bookmarksTable.id, id)).limit(1);
    if (rows.length === 0) return null;

    return this.decodeRow(rows[0]);
  }

  async save(bookmark: BookmarkState): Promise<void> {
    const validated = BookmarkStateSchema.parse(bookmark);
    await db.insert(bookmarksTable).values({
      id: validated.id,
      userId: validated.userId,
      url: validated.url,
      title: validated.title,
      description: validated.description,
      ogImage: validated.ogImage ?? null,
      category: validated.category,
      subcategory: validated.subcategory,
      status: validated.status,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });
  }

  async update(bookmark: BookmarkState): Promise<void> {
    const validated = BookmarkStateSchema.parse(bookmark);
    await db
      .update(bookmarksTable)
      .set({
        title: validated.title,
        description: validated.description,
        ogImage: validated.ogImage ?? null,
        category: validated.category,
        subcategory: validated.subcategory,
        status: validated.status,
        updatedAt: validated.updatedAt,
      })
      .where(eq(bookmarksTable.id, validated.id));
  }

  async findAllByUserId(userId: string): Promise<BookmarkState[]> {
    const rows = await db.select().from(bookmarksTable).where(eq(bookmarksTable.userId, userId));
    return rows.map((row) => this.decodeRow(row));
  }

  private decodeRow(row: any): BookmarkState {
    return BookmarkStateSchema.parse({
      ...row,
      ogImage: row.ogImage || undefined,
    });
  }
}
