import { createClient, type Client } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

let _tursoClient: Client | null = null;
let _db: LibSQLDatabase | null = null;

function getEnv() {
  const url = process.env.TURSO_DB_URL;
  const authToken = process.env.TURSO_DB_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "Missing TURSO_DB_URL or TURSO_DB_TOKEN environment variables"
    );
  }
  return { url, authToken };
}

export function getTursoClient(): Client {
  if (!_tursoClient) {
    const { url, authToken } = getEnv();
    _tursoClient = createClient({ url, authToken });
  }
  return _tursoClient;
}

export function getDb(): LibSQLDatabase {
  if (!_db) {
    _db = drizzle(getTursoClient());
  }
  return _db;
}

export const db: LibSQLDatabase = new Proxy({} as LibSQLDatabase, {
  get(_, prop) {
    const d = getDb();
    return (d as unknown as Record<string, unknown>)[prop as string];
  },
});
