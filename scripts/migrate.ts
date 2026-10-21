import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { databaseUrl } from '../src/db';
import { seedDemo } from '../src/db/seed';
import { hojeISO } from '../src/lib/regras/datas';

// Aplica as migrações pendentes. Se o banco estiver vazio e SEED_DEMO=true, carrega a empresa demo.
async function main() {
  const client = postgres(databaseUrl(), { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrações aplicadas.');
  if (process.env.SEED_DEMO === 'true') {
    const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from orgs`);
    if (n === 0) {
      await seedDemo(db as never, hojeISO());
      console.log('Empresa demo "Acme" carregada.');
    }
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
