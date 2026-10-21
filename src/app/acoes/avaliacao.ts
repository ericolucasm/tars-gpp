'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { podeComunicar } from '@/lib/regras/avaliacao';
import { listaAvaliacao, raiaChave } from '@/lib/visoes';
import { contexto, executar, exigir, exigirPmo } from './_ctx';

async function linhaDaAvaliacao(iniciativaId: string) {
  const ctx = await contexto();
  exigirPmo(ctx);
  const { ciclo, itens } = listaAvaliacao(ctx.dados);
  exigir(ciclo, 'Não há ciclo em andamento.');
  const item = itens.find((x) => x.ini.id === iniciativaId);
  exigir(item && !item.comunicado, 'Esta iniciativa não está mais em avaliação.');
  return { ctx, ciclo, item };
}

async function gravar(iniciativaId: string, cicloId: string, orgId: string, campos: Partial<typeof t.avaliacoes.$inferInsert>, base: { notas: number[]; decisao: string | null; motivoRecusa: string | null }) {
  await db.insert(t.avaliacoes).values({ iniciativaId, cicloId, orgId, notas: base.notas, decisao: base.decisao, motivoRecusa: base.motivoRecusa, ...campos })
    .onConflictDoUpdate({ target: [t.avaliacoes.iniciativaId, t.avaliacoes.cicloId], set: { ...campos, updatedAt: new Date() } });
}

export async function darNota(iniciativaId: string, criterio: number, nota: number) {
  return executar(async () => {
    exigir(criterio >= 0 && criterio < 4 && nota >= 1 && nota <= 5, 'Nota inválida.');
    const { ctx, ciclo, item } = await linhaDaAvaliacao(iniciativaId);
    const notas = item.notas.slice();
    notas[criterio] = nota;
    await gravar(iniciativaId, ciclo.id, ctx.dados.org.id, { notas }, item);
  });
}

export async function decidir(iniciativaId: string, decisao: 'pre' | 'bkl' | 'rec' | null) {
  return executar(async () => {
    const { ctx, ciclo, item } = await linhaDaAvaliacao(iniciativaId);
    const motivoRecusa = decisao === 'rec' ? item.motivoRecusa ?? ctx.dados.org.config.motivos.recusa[0] ?? null : null;
    await gravar(iniciativaId, ciclo.id, ctx.dados.org.id, { decisao, motivoRecusa }, item);
  });
}

export async function definirMotivoRecusa(iniciativaId: string, motivo: string) {
  return executar(async () => {
    const { ctx, ciclo, item } = await linhaDaAvaliacao(iniciativaId);
    exigir(ctx.dados.org.config.motivos.recusa.includes(motivo), 'Motivo inválido.');
    await gravar(iniciativaId, ciclo.id, ctx.dados.org.id, { motivoRecusa: motivo }, item);
  });
}

/** Comunica as decisões: cada uma vira uma passagem real na esteira, e solicitante e gestor são avisados. */
export async function comunicarDecisoes() {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const { dados, autoria } = ctx;
    const { ciclo, itens } = listaAvaliacao(dados);
    exigir(ciclo, 'Não há ciclo em andamento.');
    const pendentes = itens.filter((x) => !x.comunicado);
    const check = podeComunicar(pendentes.map((x) => x.decisao));
    exigir(check.ok, `Ainda há ${check.semDecisao} iniciativa(s) sem decisão. Decida todas antes de comunicar.`);
    exigir(pendentes.length > 0, 'Não há decisões novas para comunicar.');

    const pre = raiaChave(dados, 'pre')!, bkl = raiaChave(dados, 'bkl')!, can = raiaChave(dados, 'can')!;
    const agora = new Date();
    let p = 0, b = 0, x = 0;
    await db.transaction(async (tx) => {
      for (const it of pendentes) {
        const ini = it.ini;
        let para = ini.raiaId;
        const upd: Partial<typeof t.iniciativas.$inferInsert> = { updatedAt: agora, solStatus: null };
        let texto = '';
        if (it.decisao === 'pre') {
          p++; para = pre.id;
          Object.assign(upd, { raiaId: pre.id, situacao: 'Área complementando informações', preAprovadaEm: agora, classificadaEm: ini.classificadaEm ?? agora });
          texto = `"${ini.titulo}" foi pré-aprovada no ${ciclo.nome}.`;
        } else if (it.decisao === 'bkl') {
          b++; para = bkl.id;
          Object.assign(upd, { raiaId: bkl.id, prioridade: ini.prioridade ?? 'Média', situacao: 'Aguardando próximo ciclo', classificadaEm: ini.classificadaEm ?? agora });
          texto = `"${ini.titulo}" foi para o backlog no ${ciclo.nome}.`;
        } else {
          x++; para = can.id;
          Object.assign(upd, { raiaId: can.id, motivoSaida: it.motivoRecusa ?? 'Não informado', situacao: null, canceladaEm: agora });
          texto = `"${ini.titulo}" não foi aprovada no ${ciclo.nome}. Motivo: ${it.motivoRecusa ?? 'não informado'}.`;
        }
        await tx.update(t.iniciativas).set(upd).where(eq(t.iniciativas.id, ini.id));
        if (para !== ini.raiaId) {
          await tx.insert(t.transicoes).values({ orgId: dados.org.id, iniciativaId: ini.id, acao: `avaliacao_${it.decisao}`, deRaiaId: ini.raiaId, paraRaiaId: para, motivo: it.decisao === 'rec' ? it.motivoRecusa : null, ...autoria });
        }
        await tx.insert(t.avaliacoes).values({ iniciativaId: ini.id, cicloId: ciclo.id, orgId: dados.org.id, notas: it.notas, decisao: it.decisao, motivoRecusa: it.motivoRecusa, comunicado: true })
          .onConflictDoUpdate({ target: [t.avaliacoes.iniciativaId, t.avaliacoes.cicloId], set: { comunicado: true, decisao: it.decisao, updatedAt: agora } });
        await tx.insert(t.notificacoes).values([...new Set([ini.solicitanteId, ini.aprovadorId].filter(Boolean) as string[])].map((pessoaId) => ({ orgId: dados.org.id, pessoaId, texto, link: '/inicio' })));
      }
      if (ciclo.etapa === 'avaliacao') await tx.update(t.ciclos).set({ etapa: 'comunicado', comunicadoEm: agora.toISOString().slice(0, 10) }).where(eq(t.ciclos.id, ciclo.id));
    });
    return { ok: true, msg: `Decisões enviadas: ${p} pré-aprovadas, ${b} no backlog, ${x} recusadas. Cada solicitante e gestor recebeu o resultado com o motivo.` };
  });
}
