import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function databaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('Defina DATABASE_URL (ou POSTGRES_URL) com a conexão do Postgres.');
  return url;
}

type DBReal = PostgresJsDatabase<typeof schema>;

// A conexão só é aberta no primeiro uso (não na importação): o build roda sem banco
// e cada instância serverless abre a sua quando precisa. Em dev, reaproveitada no globalThis.
const g = globalThis as unknown as { __tarsDb?: DBReal };

function conectar(): DBReal {
  if (!g.__tarsDb) {
    // prepare: false é exigido pelos poolers (Supabase/Neon em modo transação)
    g.__tarsDb = drizzle(postgres(databaseUrl(), { prepare: false, max: 5 }), { schema });
  }
  return g.__tarsDb;
}

export const db = new Proxy({} as DBReal, {
  get: (_, prop) => Reflect.get(conectar(), prop),
});

export type DB = DBReal;
export { schema };
