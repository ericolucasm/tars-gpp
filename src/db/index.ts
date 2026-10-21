import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function databaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('Defina DATABASE_URL (ou POSTGRES_URL) com a conexão do Postgres.');
  return url;
}

// Uma conexão por processo. Em dev o Next recarrega módulos, então guardamos no globalThis.
const g = globalThis as unknown as { __tarsSql?: ReturnType<typeof postgres> };
// prepare: false é exigido pelo pooler do Supabase (modo transação)
const sql = g.__tarsSql ?? postgres(databaseUrl(), { prepare: false, max: 5 });
if (process.env.NODE_ENV !== 'production') g.__tarsSql = sql;

export const db = drizzle(sql, { schema });
export type DB = typeof db;
export { schema };
