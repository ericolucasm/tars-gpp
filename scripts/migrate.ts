import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { asc, eq, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { seedDemo } from '../src/db/seed';
import { hojeISO } from '../src/lib/regras/datas';

// Aplica as migrações pendentes (roda em todo deploy na Vercel).
// - Banco vazio + SEED_DEMO=true: carrega a empresa demo "Acme".
// - TARS_ADMIN_EMAIL: garante que essa pessoa existe como PMO + Admin (seu acesso real).
async function main() {
  // Migrações preferem a conexão direta (sem pooler), quando existir
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.warn('⚠ Sem DATABASE_URL: migrações não aplicadas.');
    return;
  }
  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrações aplicadas.');

  const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from orgs`);
  if (n === 0 && process.env.SEED_DEMO === 'true') {
    await seedDemo(db as never, hojeISO());
    console.log('Empresa demo "Acme" carregada.');
  }

  const email = process.env.TARS_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const org = await db.query.orgs.findFirst({ orderBy: asc(schema.orgs.createdAt) });
    if (!org) {
      console.warn('⚠ TARS_ADMIN_EMAIL definido, mas não há empresa. Use SEED_DEMO=true na primeira vez.');
    } else {
      const existe = await db.query.pessoas.findFirst({ where: eq(schema.pessoas.email, email) });
      if (!existe) {
        const pmo = await db.query.areas.findFirst({ where: eq(schema.areas.nome, 'PMO') });
        await db.insert(schema.pessoas).values({
          orgId: org.id, nome: process.env.TARS_ADMIN_NOME || email.split('@')[0], email, areaId: pmo?.id ?? null,
          cargo: 'PMO', perfis: ['pmo'], admin: true, status: 'ativo', tratamento: 'n',
        });
        console.log(`Admin ${email} criado.`);
      } else if (!existe.admin || !existe.perfis.includes('pmo')) {
        await db.update(schema.pessoas).set({ admin: true, perfis: [...new Set([...existe.perfis, 'pmo'])] }).where(eq(schema.pessoas.id, existe.id));
        console.log(`${email} agora é PMO + Admin.`);
      }
    }
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
