'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { podeMarcarLida } from '@/lib/regras/novidades';
import { validarAdiamento, validarNota, validarTarefaPessoal } from '@/lib/regras/meu-tars';
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

async function ctxPessoal() {
  const ctx = await contexto();
  exigir(podeMarcarLida({ realId: ctx.sessao.real.id, pessoaId: ctx.sessao.pessoa.id }), 'No "ver como", o que é pessoal fica como está.');
  return ctx;
}

/** Anotação pessoal num item da caixa (vazia apaga). */
export async function anotarItem(itemId: string, nota: string) {
  return executar(async () => {
    const { sessao } = await ctxPessoal();
    exigir(itemId && itemId.length <= 200, 'Item inválido.');
    const erro = validarNota(nota);
    exigir(!erro, erro ?? '');
    const valor = nota.trim() || null;
    await db.insert(t.planosPessoais).values({ orgId: sessao.orgId, pessoaId: sessao.pessoa.id, itemId, nota: valor })
      .onConflictDoUpdate({ target: [t.planosPessoais.pessoaId, t.planosPessoais.itemId], set: { nota: valor, updatedAt: new Date() } });
    return { ok: true, msg: valor ? 'Anotação salva.' : 'Anotação apagada.' };
  });
}

export async function criarTarefaPessoal(titulo: string, prazo: string | null) {
  return executar(async () => {
    const { sessao } = await ctxPessoal();
    const erro = validarTarefaPessoal({ titulo, prazo });
    exigir(!erro, erro ?? '');
    await db.insert(t.tarefasPessoais).values({ orgId: sessao.orgId, pessoaId: sessao.pessoa.id, titulo: titulo.trim(), prazo: prazo || null });
    return { ok: true, msg: 'Tarefa pessoal criada.' };
  });
}

async function minhaTarefa(id: string) {
  const ctx = await ctxPessoal();
  const tf = await db.query.tarefasPessoais.findFirst({ where: and(eq(t.tarefasPessoais.id, id), eq(t.tarefasPessoais.pessoaId, ctx.sessao.pessoa.id)) });
  exigir(tf, 'Tarefa não encontrada.');
  return tf;
}

export async function alternarTarefaPessoal(id: string) {
  return executar(async () => {
    const tf = await minhaTarefa(id);
    await db.update(t.tarefasPessoais).set({ concluidaEm: tf.concluidaEm ? null : new Date() }).where(eq(t.tarefasPessoais.id, tf.id));
    return { ok: true, msg: tf.concluidaEm ? 'Tarefa reaberta.' : 'Tarefa concluída.' };
  });
}

export async function excluirTarefaPessoal(id: string) {
  return executar(async () => {
    const tf = await minhaTarefa(id);
    await db.delete(t.tarefasPessoais).where(eq(t.tarefasPessoais.id, tf.id));
    await db.delete(t.planosPessoais).where(and(eq(t.planosPessoais.pessoaId, tf.pessoaId), eq(t.planosPessoais.itemId, `pessoal-${tf.id}`)));
    return { ok: true, msg: 'Tarefa excluída.' };
  });
}
