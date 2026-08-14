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
    .execute(`
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)
    .catch((err) => {
      console.warn("[DB Client] Fallback schema init:", err.message);
    });
}
