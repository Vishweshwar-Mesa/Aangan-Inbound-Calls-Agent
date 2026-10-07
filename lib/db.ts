import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./db/schema";

// Falls back to a syntactically valid placeholder so `next build` and local
// type-checking work before DATABASE_URL is set in .env.local. The fallback
// is never queried outside this file.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/aangan";

export const db = drizzle(neon(connectionString), { schema });
