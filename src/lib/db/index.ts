import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_TOKEN;

if (!url || !authToken) {
  throw new Error(
    "Missing TURSO_DB_URL or TURSO_DB_TOKEN environment variables"
  );
}

export const tursoClient = createClient({ url, authToken });
export const db = drizzle(tursoClient);
