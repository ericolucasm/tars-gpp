import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { auth } from './auth';
import type { Pessoa } from './dados';

export type Perfil = 'colaborador' | 'gestor' | 'gp' | 'pmo';
export const PERFIS: Perfil[] = ['colaborador', 'gestor', 'gp', 'pmo'];

export const COOKIE_DEV = 'tars_dev';
export const COOKIE_VER = 'tars_ver';

export function modoAuth(): 'dev' | 'google' {
  return process.env.AUTH_MODE === 'dev' ? 'dev' : 'google';
}

/** Perfil "mais alto" de uma pessoa: define a tela inicial. */
export function perfilPrincipal(p: Pick<Pessoa, 'perfis'>): Perfil {
  for (const x of ['pmo', 'gp', 'gestor'] as Perfil[]) if (p.perfis.includes(x)) return x;
  return 'colaborador';
}

export function perfisDe(p: Pessoa): Perfil[] {
  if (p.externo) return [];
  const set = new Set<Perfil>(['colaborador']);
  for (const x of p.perfis) if ((PERFIS as string[]).includes(x)) set.add(x as Perfil);
  return PERFIS.filter((x) => set.has(x));
}

export type Persona = { id: string; nome: string; area: string; grupo: Perfil };

export type Sessao = {
  orgId: string;
  real: Pessoa; // quem fez login
  pessoa: Pessoa; // em nome de quem a tela é mostrada (pessoa escolhida no "ver como" ou a própria pessoa)
  perfil: Perfil; // visão ativa
  perfis: Perfil[]; // visões que essa pessoa pode alternar
  admin: boolean; // quem fez login é admin: pode "ver como" qualquer pessoa cadastrada
  personas: Persona[]; // admin: pessoas disponíveis no "ver como" (a própria admin sempre primeiro)
};

async function pessoaLogada(): Promise<Pessoa | null> {
  const store = await cookies();
  if (modoAuth() === 'dev') {
    const id = store.get(COOKIE_DEV)?.value;
    if (!id) return null;
    return (await db.query.pessoas.findFirst({ where: eq(t.pessoas.id, id) })) ?? null;
  }
  const sessao = await auth().api.getSession({ headers: await headers() });
  const user = sessao?.user;
  if (!user) return null;
  const email = user.email.trim().toLowerCase();
  const p = await db.query.pessoas.findFirst({ where: eq(t.pessoas.email, email) });
  if (!p || p.externo) return null;
  if (p.authUserId !== user.id || p.status !== 'ativo') {
    // primeiro acesso: liga a conta Google à pessoa cadastrada e ativa o convite
    await db.update(t.pessoas).set({ authUserId: user.id, status: 'ativo' }).where(eq(t.pessoas.id, p.id));
    return { ...p, authUserId: user.id, status: 'ativo' };
  }
  return p;
}

export const getSessao = cache(async (): Promise<Sessao | null> => {
  const real = await pessoaLogada();
  if (!real) return null;
  const store = await cookies();
  const [perfilCookie, personaCookie] = (store.get(COOKIE_VER)?.value ?? '').split('|');

  let pessoa = real;
  let personas: Persona[] = [];
  if (real.admin) {
    // Admin pode "ser" qualquer pessoa cadastrada (inclusive quem ainda não fez o 1º acesso) para validar o fluxo.
    const [todas, areas] = await Promise.all([
      db.select().from(t.pessoas).where(eq(t.pessoas.orgId, real.orgId)).orderBy(t.pessoas.seq),
      db.select({ id: t.areas.id, nome: t.areas.nome }).from(t.areas).where(eq(t.areas.orgId, real.orgId)),
    ]);
    const internas = todas.filter((p) => !p.externo);
    pessoa = internas.find((p) => p.id === personaCookie) ?? real;
    const nomeArea = (id: string | null) => areas.find((a) => a.id === id)?.nome ?? '';
    personas = [real, ...internas.filter((p) => p.id !== real.id)].map((p) => ({ id: p.id, nome: p.nome, area: nomeArea(p.areaId), grupo: perfilPrincipal(p) }));
  }

  const perfis = perfisDe(pessoa);
  const perfil = perfis.includes(perfilCookie as Perfil) ? (perfilCookie as Perfil) : perfilPrincipal(pessoa);
  return { orgId: real.orgId, real, pessoa, perfil, perfis, admin: real.admin, personas };
});

export async function exigirSessao(): Promise<Sessao> {
  const s = await getSessao();
  if (!s) redirect('/login');
  return s;
}

/** Garante que a visão ativa é uma das permitidas para a página. */
export async function exigirPerfil(...permitidos: Perfil[]): Promise<Sessao> {
  const s = await exigirSessao();
  if (!permitidos.includes(s.perfil)) redirect('/inicio');
  return s;
}

export async function exigirAdmin(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!s.admin) redirect('/inicio');
  return s;
}

/** Permissões vêm dos perfis da pessoa em nome de quem se age. */
export function temPerfil(s: Sessao, perfil: string) {
  return s.pessoa.perfis.includes(perfil);
}
