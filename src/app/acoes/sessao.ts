'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_DEV, COOKIE_VER, getSessao, modoAuth } from '@/lib/sessao';
import { supabaseServidor } from '@/lib/supabase/server';

const UM_ANO = 60 * 60 * 24 * 365;

export async function trocarVisao(perfil: string, personaId: string) {
  const s = await getSessao();
  if (!s) redirect('/login');
  if (!(s.perfis as string[]).includes(perfil)) return;
  const store = await cookies();
  store.set(COOKIE_VER, `${perfil}|${s.admin ? personaId : ''}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: UM_ANO });
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

export async function entrar(_: unknown, form: FormData): Promise<{ erro?: string }> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const senha = String(form.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' };
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: 'E-mail ou senha incorretos.' };
  (await cookies()).delete(COOKIE_VER);
  redirect('/inicio');
}
