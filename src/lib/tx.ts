import { dbSource, getPglite, type Sql } from "@/lib/db";

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

/** Run `fn` inside a single-connection transaction (PGLite or Neon). */
export async function withTx<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  if (dbSource === "pglite") {
    const pg = await getPglite();
    return pg.transaction(async (tx) => {
      const sql = toSql(async <R>(text: string, params: unknown[]) => {
        const result = await tx.query<R>(text, params);
        return result.rows;
      });
      return fn(sql);
    });
  }

  const { Client } = await import("pg");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for Neon transactions");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query("BEGIN");
    const sql = toSql(async <R>(text: string, params: unknown[]) => {
      const result = await client.query(text, params);
      return result.rows as R[];
    });
    const out = await fn(sql);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    await client.end();
  }
}
