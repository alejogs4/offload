import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import { DefaultTaxonomy } from "~/modules/bookmark/domain/bookmark-category";

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Determine fallback URL for serverless environments like Vercel
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const fallbackUrl = isServerless ? "file:/tmp/sqlite.db" : "file:sqlite.db";

const url = tursoUrl || fallbackUrl;

if (isServerless && !process.env.TURSO_DATABASE_URL) {
  console.warn("[DB Client] WARNING: Running on Vercel without TURSO_DATABASE_URL environment variable!");
}

export const client = createClient({
  url,
  authToken: tursoToken,
});

export const db = drizzle(client, { schema });

// Auto-create table schema only for local file databases
if (url.startsWith("file:")) {
  client
    .executeMultiple(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at INTEGER,
        refresh_token_expires_at INTEGER,
        scope TEXT,
        password TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        issuer TEXT
      );

      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        og_image TEXT,
        category TEXT NOT NULL DEFAULT '${DefaultTaxonomy.CATEGORY}',
        subcategory TEXT NOT NULL DEFAULT '${DefaultTaxonomy.SUBCATEGORY}',
        status TEXT NOT NULL DEFAULT '${BookmarkStatus.PENDING}',
        is_starred INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
      CREATE INDEX IF NOT EXISTS bookmarks_user_id_status_idx ON bookmarks(user_id, status);
    `)
    .then(() => ensureBookmarksStarredColumn())
    .catch((err) => {
      console.warn("[DB Client] Fallback schema init:", err.message);
    });
} else {
  ensureBookmarksStarredColumn().catch((err) => {
    console.warn("[DB Client] Starred column migration check:", err.message);
  });
}

export async function ensureBookmarksStarredColumn(): Promise<void> {
  try {
    const info = await client.execute("PRAGMA table_info(bookmarks);");
    if (info.rows.length === 0) return;

    const hasIsStarred = info.rows.some((row) => row.name === "is_starred");
    if (!hasIsStarred) {
      await client.execute(
        "ALTER TABLE bookmarks ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0;"
      );
      await client.execute(
        "UPDATE bookmarks SET is_starred = 0 WHERE is_starred IS NULL;"
      );
    }
  } catch (err: any) {
    if (!err?.message?.includes("duplicate column name")) {
      console.warn("[DB Client] Could not ensure is_starred column:", err?.message ?? err);
    }
  }
}
