'use server';

import { db, schema as t } from '@/db';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { validarAdiamento } from '@/lib/regras/meu-tars';
import { contexto, executar, exigir } from './_ctx';

const PLANOS = ['hoje', 'semana', 'depois'];

/**
 * A pessoa organiza um item da própria caixa: planejar para hoje, esta semana ou depois, adiar até uma data (lembrete),
 * ou tirar o plano. É pessoal: não muda prazo oficial nenhum, e no "ver como" o admin não mexe.
 */
export async function planejarItem(itemId: string, p: { plano: string | null; adiarAte?: string | null }) {
  return executar(async () => {
    const { sessao, hoje } = await contexto();
    exigir(podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id }), 'No "ver como", o planejamento da pessoa fica como está.');
    exigir(itemId && itemId.length <= 200, 'Item inválido.');
    exigir(p.plano === null || PLANOS.includes(p.plano), 'Plano inválido.');
    if (p.adiarAte) { const erro = validarAdiamento(p.adiarAte, hoje); exigir(!erro, erro ?? ''); }
    const valores = { plano: p.adiarAte ? null : p.plano, planejadoEm: hoje, adiadoAte: p.adiarAte ?? null, updatedAt: new Date() };
    await db.insert(t.planosPessoais).values({ orgId: sessao.orgId, pessoaId: sessao.pessoa.id, itemId, ...valores })
      .onConflictDoUpdate({ target: [t.planosPessoais.pessoaId, t.planosPessoais.itemId], set: valores });
    const msg = p.adiarAte ? `Adiado. Volta para a sua caixa em ${p.adiarAte.slice(8, 10)}/${p.adiarAte.slice(5, 7)}.`
      : p.plano === 'hoje' ? 'Planejado para hoje.' : p.plano === 'semana' ? 'Planejado para esta semana.' : p.plano === 'depois' ? 'Deixado para depois.' : 'Plano removido.';
    return { ok: true, msg };
  });
}
