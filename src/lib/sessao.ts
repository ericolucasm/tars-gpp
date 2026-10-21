import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq, or } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { supabaseServidor } from './supabase/server';
import type { Pessoa } from './dados';

export type Perfil = 'colaborador' | 'gestor' | 'gp' | 'pmo';
export const PERFIS: Perfil[] = ['colaborador', 'gestor', 'gp', 'pmo'];

export const COOKIE_DEV = 'tars_dev';
export const COOKIE_VER = 'tars_ver';

export function modoAuth(): 'dev' | 'supabase' {
  return process.env.AUTH_MODE === 'dev' ? 'dev' : 'supabase';
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
  personas: Pessoa[]; // admin: pessoas disponíveis para a visão ativa
};

async function pessoaLogada(): Promise<Pessoa | null> {
  const store = await cookies();
  if (modoAuth() === 'dev') {
    const id = store.get(COOKIE_DEV)?.value;
    if (!id) return null;
    return (await db.query.pessoas.findFirst({ where: eq(t.pessoas.id, id) })) ?? null;
  }
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const email = (user.email ?? '').toLowerCase();
  const p = await db.query.pessoas.findFirst({ where: or(eq(t.pessoas.authUserId, user.id), eq(t.pessoas.email, email)) });
  if (!p) return null;
  if (!p.authUserId || p.status !== 'ativo') {
    // primeiro acesso: liga a conta do Supabase à pessoa cadastrada e ativa o convite
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
    // A própria admin só aparece se tiver esse perfil (na visão Colaborador, só se for colaboradora de fato)
    const servePropria = perfil === 'colaborador' ? perfilPrincipal(real) === 'colaborador' : real.perfis.includes(perfil);
    const personas = todas.filter((p) => !p.externo && p.status === 'ativo'
      && (perfil === 'colaborador' || p.perfis.includes(perfil))
      && (p.id !== real.id || servePropria));
    // ordem: a própria admin, depois quem tem esse perfil como principal, depois ordem de cadastro
    const peso = (p: Pessoa) => (p.id === real.id ? 0 : perfilPrincipal(p) === perfil ? 1 : 2);
    personas.sort((a, b) => peso(a) - peso(b) || (a.seq ?? 0) - (b.seq ?? 0));
    const pessoa = personas.find((p) => p.id === personaCookie) ?? personas[0] ?? real;
    return { orgId: real.orgId, real, pessoa, perfil, perfis: PERFIS, admin: true, personas };
  }

  const perfis = perfisDe(real);
  const perfil = perfis.includes(perfilCookie as Perfil) ? (perfilCookie as Perfil) : perfilPrincipal(real);
  return { orgId: real.orgId, real, pessoa: real, perfil, perfis, admin: false, personas: [] };
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
