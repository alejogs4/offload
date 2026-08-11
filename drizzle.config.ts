import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:sqlite.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
