import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqliteDbFile = process.env.DATABASE_URL || "sqlite.db";
const sqlite = new Database(sqliteDbFile);

// Auto-create table if not exists for quick local SQLite startup
sqlite.exec(`
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
`);

export const db = drizzle(sqlite, { schema });
