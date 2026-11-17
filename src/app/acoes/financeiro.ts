'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { contexto, executar, exigir, exigirPmo } from './_ctx';

const valido = (v: number) => Number.isFinite(v) && v > 0 && v < 1e11;

async function ctxGpOuPmo(iniciativaId: string) {
  const ctx = await contexto();
  const ini = ctx.dados.iniciativas.find((i) => i.id === iniciativaId);
  exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
  exigir(ini.gpId === ctx.eu.id || ctx.ehPmo, 'Só o gerente do projeto ou o PMO podem mexer no financeiro do projeto.');
  return { ...ctx, ini };
}

/** Lança um custo realizado (nota, fatura, horas de fornecedor...). */
export async function lancarCusto(iniciativaId: string, l: { data: string; descricao: string; valor: number }) {
  return executar(async () => {
    const { dados, eu, ini } = await ctxGpOuPmo(iniciativaId);
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(l.data), 'Informe a data do gasto.');
    exigir(l.descricao.trim().length >= 3, 'Descreva o gasto.');
    exigir(valido(l.valor), 'Informe um valor maior que zero.');
    await db.insert(t.lancamentosCusto).values({ orgId: dados.org.id, iniciativaId: ini.id, data: l.data, descricao: l.descricao.trim(), valor: l.valor, autorId: eu.id });
    return { ok: true, msg: 'Custo lançado.' };
  });
}

export async function removerLancamento(id: string) {
  return executar(async () => {
    const ctx0 = await contexto();
    const l = ctx0.dados.lancamentos.find((x) => x.id === id);
    exigir(l, 'Lançamento não encontrado.');
    await ctxGpOuPmo(l.iniciativaId);
    await db.delete(t.lancamentosCusto).where(and(eq(t.lancamentosCusto.id, id), eq(t.lancamentosCusto.iniciativaId, l.iniciativaId)));
    return { ok: true, msg: 'Lançamento removido.' };
  });
}

/** GP atualiza quanto prevê gastar até o fim do projeto. */
export async function definirPrevisao(iniciativaId: string, valor: number) {
  return executar(async () => {
    const { ini } = await ctxGpOuPmo(iniciativaId);
    exigir(valido(valor), 'Informe a previsão de custo total do projeto.');
    await db.update(t.iniciativas).set({ previsaoCusto: valor, updatedAt: new Date() }).where(eq(t.iniciativas.id, ini.id));
    return { ok: true, msg: 'Previsão de custo atualizada.' };
  });
}

/** PMO define o orçamento aprovado diretamente (ex.: no play). Para o GP, a mudança de custo passa por pedido. */
export async function definirOrcamento(iniciativaId: string, valor: number) {
  return executar(async () => {
    const ctx = await ctxGpOuPmo(iniciativaId);
    exigirPmo(ctx);
    exigir(valido(valor), 'Informe o orçamento aprovado do projeto.');
    await db.update(t.iniciativas).set({ orcamentoAprovado: valor, updatedAt: new Date() }).where(eq(t.iniciativas.id, ctx.ini.id));
    return { ok: true, msg: 'Orçamento aprovado atualizado.' };
  });
}
