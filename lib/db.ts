import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./db/schema";

// Falls back to a syntactically valid placeholder so `next build` and local
// type-checking work before DATABASE_URL is set in .env.local. `||` (not
// `??`) matters here: .env.local can define the var as an empty string
// rather than leaving it unset, and `??` doesn't fall back on that.
const connectionString =
  process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/aangan";

export const db = drizzle(neon(connectionString), { schema });
