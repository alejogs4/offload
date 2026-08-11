import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Create LibSQL client (works for remote Turso DB AND local file:sqlite.db)
const client = createClient({
  url: tursoUrl || "file:sqlite.db",
  authToken: tursoToken,
});

export const db = drizzle(client, { schema });

// Auto-create schema table if running on local file DB
if (!tursoUrl || tursoUrl.startsWith("file:")) {
  client.execute(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      og_image TEXT,
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      subcategory TEXT NOT NULL DEFAULT 'General',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `).catch((err) => {
    console.warn("[DB Client] Auto-table check warning:", err.message);
  });
}
