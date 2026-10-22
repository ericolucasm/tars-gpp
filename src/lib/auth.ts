import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';

// Login com Google (Better Auth). Regra de acesso: só entra quem está cadastrado em Pessoas
// com o mesmo e-mail da conta Google (e não é fornecedor externo).

export function urlDoApp() {
  const url = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  return url.replace(/\/$/, '');
}

async function pessoaLiberada(email: string | null | undefined) {
  if (!email) return false;
  const p = await db.query.pessoas.findFirst({ where: eq(t.pessoas.email, email.trim().toLowerCase()) });
  return !!p && !p.externo;
}

function criar() {
  return betterAuth({
    baseURL: urlDoApp(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: t.authUser, session: t.authSession, account: t.authAccount, verification: t.authVerification },
    }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        prompt: 'select_account',
      },
    },
    databaseHooks: {
      user: {
        create: {
          // conta Google nova: só é criada se o e-mail estiver cadastrado no TARS
          before: async (user) => ((await pessoaLiberada(user.email)) ? undefined : false),
        },
      },
      session: {
        create: {
          // a cada login: a pessoa precisa continuar cadastrada
          before: async (session) => {
            const u = await db.query.authUser.findFirst({ where: eq(t.authUser.id, session.userId) });
            return (await pessoaLiberada(u?.email)) ? undefined : false;
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

// Criado no primeiro uso (o build roda sem banco e sem segredos).
const g = globalThis as unknown as { __tarsAuth?: ReturnType<typeof criar> };
export function auth() {
  if (!g.__tarsAuth) g.__tarsAuth = criar();
  return g.__tarsAuth;
}
