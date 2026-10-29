'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_DEV, COOKIE_VER, getSessao, modoAuth } from '@/lib/sessao';

const UM_ANO = 60 * 60 * 24 * 365;

/** Troca o perfil ativo, mantendo a pessoa do "ver como". */
export async function trocarVisao(perfil: string) {
  const s = await getSessao();
  if (!s) redirect('/login');
  if (!(s.perfis as string[]).includes(perfil)) return;
  const store = await cookies();
  store.set(COOKIE_VER, `${perfil}|${s.admin ? s.pessoa.id : ''}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: UM_ANO });
  redirect('/inicio');
}

/** Admin: passa a ver o app como outra pessoa cadastrada, no perfil principal dela. */
export async function verComoPessoa(personaId: string) {
  const s = await getSessao();
  if (!s) redirect('/login');
  if (!s.admin || !s.personas.some((p) => p.id === personaId)) return;
  const store = await cookies();
  store.set(COOKIE_VER, `|${personaId}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: UM_ANO });
  redirect('/inicio');
}

/** Login sem senha, só no modo de desenvolvimento/demo local. */
export async function entrarDev(pessoaId: string) {
  if (modoAuth() !== 'dev') throw new Error('Login de desenvolvimento desativado');
  const store = await cookies();
  store.set(COOKIE_DEV, pessoaId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: UM_ANO });
  store.delete(COOKIE_VER);
  redirect('/inicio');
}
