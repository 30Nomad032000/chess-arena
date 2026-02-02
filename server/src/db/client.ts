import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { config } from "../config.js";

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

/**
 * Execute a parameterized SQL query against the connection pool.
 * Returns the full QueryResult, including rows, rowCount, and fields.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 500) {
    console.warn(`Slow query (${duration}ms):`, text);
  }

  return result;
}

/**
 * Acquire a client from the pool for use in transactions.
 * Caller is responsible for releasing the client.
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
}
