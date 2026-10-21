import 'server-only';
import { revalidatePath } from 'next/cache';
import { db, schema as t } from '@/db';
import { carregarOrg } from '@/lib/dados';
import { getSessao, temPerfil, type Sessao } from '@/lib/sessao';
import { hojeISO } from '@/lib/regras/datas';

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

export class ErroRegra extends Error {}

/** Contexto comum das ações de servidor: quem está agindo, dados da empresa e utilitários. */
export async function contexto() {
  const sessao = await getSessao();
  if (!sessao) throw new ErroRegra('Sua sessão expirou. Entre de novo.');
  const dados = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const autoria = { autorId: sessao.real.id, emNomeDeId: sessao.pessoa.id !== sessao.real.id ? sessao.pessoa.id : null };
  const ehPmo = temPerfil(sessao, 'pmo');
  return { sessao, dados, hoje, autoria, ehPmo, eu: sessao.pessoa };
}

export async function notificar(orgId: string, pessoaIds: (string | null | undefined)[], texto: string, link?: string) {
  const ids = [...new Set(pessoaIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  await db.insert(t.notificacoes).values(ids.map((pessoaId) => ({ orgId, pessoaId, texto, link })));
}

/** Executa a ação, converte erros de regra em mensagem e atualiza as telas. */
export async function executar(fn: () => Promise<Resultado | void>): Promise<Resultado> {
  try {
    const r = await fn();
    revalidatePath('/', 'layout');
    return r ?? { ok: true };
  } catch (e) {
    if (e instanceof ErroRegra) return { ok: false, erro: e.message };
    console.error(e);
    return { ok: false, erro: 'Não foi possível salvar. Tente de novo.' };
  }
}

export function exigir(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ErroRegra(msg);
}

export function exigirPmo(ctx: { ehPmo: boolean }) {
  exigir(ctx.ehPmo, 'Apenas o PMO pode fazer isso.');
}

export function exigirAdminCtx(s: Sessao) {
  exigir(s.admin, 'Apenas administradores podem fazer isso.');
}
