import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Direct (unpooled) connection — migrations shouldn't go through PgBouncer.
    // `||` not `??`: an empty-string env var (unset in .env.local) must also
    // fall back, and `??` only catches null/undefined.
    url: process.env.DATABASE_URL_UNPOOLED || "postgresql://user:password@localhost:5432/aangan",
  },
});
