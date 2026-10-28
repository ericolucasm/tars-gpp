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

export type Sessao = {
  orgId: string;
  real: Pessoa; // quem fez login
  pessoa: Pessoa; // em nome de quem a tela é mostrada (persona do "ver como" ou a própria pessoa)
  perfil: Perfil; // visão ativa
  perfis: Perfil[]; // visões que essa pessoa pode alternar
  admin: boolean;
  /** Admin agindo como ele mesmo: em qualquer visão, enxerga e opera tudo daquele perfil (modo teste). */
  coringa: boolean;
  personas: Pessoa[]; // admin: pessoas disponíveis para a visão ativa (a própria admin sempre primeiro)
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

  if (real.admin) {
    const todas = await db.select().from(t.pessoas).where(eq(t.pessoas.orgId, real.orgId)).orderBy(t.pessoas.seq);
    const perfil: Perfil = (PERFIS as string[]).includes(perfilCookie) ? (perfilCookie as Perfil) : perfilPrincipal(real);
    // A própria admin vem sempre primeiro (modo coringa); depois, quem tem esse perfil, para conferir a visão de alguém.
    // Entram também pessoas que ainda não fizeram o 1º acesso.
    const outras = todas.filter((p) => !p.externo && p.id !== real.id && (perfil === 'colaborador' || p.perfis.includes(perfil)));
    outras.sort((a, b) => Number(perfilPrincipal(b) === perfil) - Number(perfilPrincipal(a) === perfil) || (a.seq ?? 0) - (b.seq ?? 0));
    const personas = [real, ...outras];
    const pessoa = personas.find((p) => p.id === personaCookie) ?? real;
    return { orgId: real.orgId, real, pessoa, perfil, perfis: PERFIS, admin: true, coringa: pessoa.id === real.id, personas };
  }

  const perfis = perfisDe(real);
  const perfil = perfis.includes(perfilCookie as Perfil) ? (perfilCookie as Perfil) : perfilPrincipal(real);
  return { orgId: real.orgId, real, pessoa: real, perfil, perfis, admin: false, coringa: false, personas: [] };
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
  return s.coringa || s.pessoa.perfis.includes(perfil);
}
