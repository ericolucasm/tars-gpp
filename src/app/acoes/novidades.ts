'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { contexto, executar, exigir } from './_ctx';

/** Marca todos os avisos da pessoa como lidos (eles continuam no histórico). */
export async function marcarTodasLidas() {
  return executar(async () => {
    const { sessao } = await contexto();
    exigir(podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id }), 'No "ver como", os avisos da pessoa ficam como estão.');
    await db.update(t.notificacoes).set({ lida: true })
      .where(and(eq(t.notificacoes.orgId, sessao.orgId), eq(t.notificacoes.pessoaId, sessao.pessoa.id), eq(t.notificacoes.lida, false)));
    return { ok: true, msg: 'Tudo marcado como lido.' };
  });
}
