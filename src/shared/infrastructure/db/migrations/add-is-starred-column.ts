import { client } from "../client";

export async function migrateBookmarkIsStarred() {
  try {
    const info = await client.execute("PRAGMA table_info(bookmarks);");
    const hasIsStarred = info.rows.some((row) => row.name === "is_starred");

    if (!hasIsStarred) {
      await client.execute(
        "ALTER TABLE bookmarks ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0;"
      );
      console.log("[Migration] Added 'is_starred' column to bookmarks table");
    }

    const updateRes = await client.execute(
      "UPDATE bookmarks SET is_starred = 0 WHERE is_starred IS NULL;"
    );

    return {
      success: true,
      columnAdded: !hasIsStarred,
      rowsUpdated: updateRes.rowsAffected,
    };
  } catch (error: any) {
    console.error("[Migration] Error during migrateBookmarkIsStarred:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateBookmarkIsStarred()
    .then((res) => {
      console.log("[Migration] migrateBookmarkIsStarred finished:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration] migrateBookmarkIsStarred failed:", err);
      process.exit(1);
    });
}
