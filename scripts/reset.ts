import 'dotenv/config';
import postgres from 'postgres';
import { databaseUrl } from '../src/db';

// Apaga tudo (só para desenvolvimento). Depois rode: npm run db:migrate
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('reset bloqueado em produção');
  const sql = postgres(databaseUrl(), { max: 1, onnotice: () => {} });
  await sql`drop schema if exists public cascade`;
  await sql`drop schema if exists drizzle cascade`;
  await sql`create schema public`;
  await sql.end();
  console.log('Banco zerado.');
}
main().catch((e) => { console.error(e); process.exit(1); });
