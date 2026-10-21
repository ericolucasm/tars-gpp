'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { dataDaSemana, descreverMudanca, desvio, fasesDoModelo, rotuloDesvio, type Fase } from '@/lib/regras/projeto';
import { gestorDe } from '@/lib/regras/pessoas';
import { nomeMes } from '@/lib/regras/datas';
import { fasesDo, linhaBaseDo, pessoa } from '@/lib/visoes';
import { contexto, executar, exigir, exigirPmo, notificar } from './_ctx';

// Quem mexe no projeto: o GP dele ou o PMO.
async function ctxProjeto(iniciativaId: string) {
  const ctx = await contexto();
  const ini = ctx.dados.iniciativas.find((i) => i.id === iniciativaId);
  exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
  exigir(ini.gpId === ctx.eu.id || ctx.ehPmo, 'Só o gerente do projeto ou o PMO podem alterar este projeto.');
  return { ...ctx, ini };
}

async function ctxFase(faseId: string) {
  const ctx0 = await contexto();
  const fase = ctx0.dados.fases.find((f) => f.id === faseId);
  exigir(fase, 'Fase não encontrada.');
  const ctx = await ctxProjeto(fase.iniciativaId);
  return { ...ctx, fase };
}

/** PMO cobra o status da semana dos GPs dos projetos indicados. */
export async function cobrarStatus(iniciativaIds: string[]) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    for (const id of iniciativaIds) {
      const ini = ctx.dados.iniciativas.find((i) => i.id === id);
      if (ini?.gpId) await notificar(ctx.dados.org.id, [ini.gpId], `O PMO pediu o status da semana de "${ini.titulo}".`, `/projetos/${ini.id}#status`);
    }
    return { ok: true, msg: 'GPs avisados.' };
  });
}

export async function definirFarol(iniciativaId: string, farol: 'ok' | 'aten' | 'crit') {
  return executar(async () => {
    const { ini } = await ctxProjeto(iniciativaId);
    exigir(['ok', 'aten', 'crit'].includes(farol), 'Farol inválido.');
    await db.update(t.iniciativas).set({ farol, updatedAt: new Date() }).where(eq(t.iniciativas.id, ini.id));
  });
}

// ---------- Fases ----------

export async function moverFase(faseId: string, inicioSemana: number, duracao: number) {
  return executar(async () => {
    await ctxFase(faseId);
    exigir(inicioSemana >= 0 && duracao >= 1 && duracao <= 104, 'Datas inválidas.');
    await db.update(t.projetoFases).set({ inicioSemana, duracao }).where(eq(t.projetoFases.id, faseId));
  });
}

export async function removerFase(faseId: string) {
  return executar(async () => {
    await ctxFase(faseId);
    await db.delete(t.projetoFases).where(eq(t.projetoFases.id, faseId));
  });
}

export async function adicionarFase(iniciativaId: string, faseBibliotecaId: string) {
  return executar(async () => {
    const { dados, ini } = await ctxProjeto(iniciativaId);
    const bib = dados.fasesBiblioteca.find((f) => f.id === faseBibliotecaId);
    exigir(bib, 'Fase não encontrada na biblioteca.');
    const fases = fasesDo(dados, ini.id);
    const fim = fases.reduce((m, f) => Math.max(m, f.inicioSemana + f.duracao), 0);
    await db.insert(t.projetoFases).values({ iniciativaId: ini.id, nome: bib.nome, inicioSemana: fim, duracao: bib.duracaoSemanas, ordem: fases.length, criterioConclusao: bib.criterioConclusao });
  });
}

/** Volta as fases do modelo para a sequência padrão (sem apagar tarefas; fases fora do modelo ficam como estão). */
export async function recriarDoModelo(iniciativaId: string) {
  return executar(async () => {
    const { dados, ini } = await ctxProjeto(iniciativaId);
    const modelo = dados.modelos.find((m) => m.id === ini.modeloId);
    exigir(modelo, 'Este projeto não tem modelo.');
    const bib = modelo.fases.map((id) => dados.fasesBiblioteca.find((f) => f.id === id)).filter(Boolean) as typeof dados.fasesBiblioteca;
    const padrao = fasesDoModelo(bib);
    const atuais = fasesDo(dados, ini.id);
    await db.transaction(async (tx) => {
      for (const p of padrao) {
        const f = atuais.find((x) => x.nome === p.nome);
        if (f) await tx.update(t.projetoFases).set({ inicioSemana: p.inicioSemana, duracao: p.duracao, ordem: p.ordem }).where(eq(t.projetoFases.id, f.id));
        else await tx.insert(t.projetoFases).values({ ...p, iniciativaId: ini.id });
      }
    });
  });
}

/** Congela a linha de base. Se já existe, o GP pede a mudança ao PMO; o PMO atualiza direto. */
export async function congelarLinhaBase(iniciativaId: string) {
  return executar(async () => {
    const { dados, ini, eu, ehPmo } = await ctxProjeto(iniciativaId);
    const fases: Fase[] = fasesDo(dados, ini.id).map((f) => ({ id: f.id, nome: f.nome, inicioSemana: f.inicioSemana, duracao: f.duracao }));
    exigir(fases.length, 'O projeto não tem fases.');
    const base = linhaBaseDo(dados, ini.id);
    if (!base || ehPmo) {
      await db.insert(t.linhasBase).values({ iniciativaId: ini.id, fases, congeladaPor: eu.id })
        .onConflictDoUpdate({ target: t.linhasBase.iniciativaId, set: { fases, congeladaEm: new Date(), congeladaPor: eu.id } });
      if (base) await db.update(t.mudancasBase).set({ status: 'aprovada', decididoPor: eu.id, decididoEm: new Date() }).where(and(eq(t.mudancasBase.iniciativaId, ini.id), eq(t.mudancasBase.status, 'pendente')));
      return { ok: true, msg: base ? 'Linha de base atualizada.' : 'Linha de base congelada. Mudanças agora geram desvio.' };
    }
    const descricao = descreverMudanca(base, fases);
    await db.delete(t.mudancasBase).where(and(eq(t.mudancasBase.iniciativaId, ini.id), eq(t.mudancasBase.status, 'pendente')));
    await db.insert(t.mudancasBase).values({ iniciativaId: ini.id, fases, descricao, solicitanteId: eu.id });
    const pmos = dados.pessoas.filter((p) => p.perfis.includes('pmo')).map((p) => p.id);
    await notificar(dados.org.id, pmos, `${eu.nome} pede para alterar a linha de base de "${ini.titulo}": ${descricao}.`, `/projetos/${ini.id}`);
    return { ok: true, msg: `Pedido enviado ao PMO: ${descricao}.` };
  });
}

export async function decidirMudancaBase(mudancaId: string, aprovar: boolean) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const m = ctx.dados.mudancas.find((x) => x.id === mudancaId);
    exigir(m && m.status === 'pendente', 'Este pedido já foi decidido.');
    const ini = ctx.dados.iniciativas.find((i) => i.id === m.iniciativaId);
    const agora = new Date();
    await db.update(t.mudancasBase).set({ status: aprovar ? 'aprovada' : 'recusada', decididoPor: ctx.eu.id, decididoEm: agora }).where(eq(t.mudancasBase.id, m.id));
    if (aprovar) await db.update(t.linhasBase).set({ fases: m.fases, congeladaEm: agora, congeladaPor: ctx.eu.id }).where(eq(t.linhasBase.iniciativaId, m.iniciativaId));
    await notificar(ctx.dados.org.id, [m.solicitanteId], `O PMO ${aprovar ? 'aprovou' : 'recusou'} a mudança de linha de base de "${ini?.titulo ?? ''}".`, `/projetos/${m.iniciativaId}`);
    return { ok: true, msg: aprovar ? 'Mudança aprovada. A nova linha de base vale a partir de agora.' : 'Mudança recusada. O GP foi avisado.' };
  });
}

export async function confirmarFimFase(faseId: string) {
  return executar(async () => {
    const { fase } = await ctxFase(faseId);
    await db.update(t.projetoFases).set({ confirmadaEm: fase.confirmadaEm ? null : new Date() }).where(eq(t.projetoFases.id, faseId));
  });
}

// ---------- Tarefas ----------

export async function adicionarTarefa(faseId: string, titulo: string, responsavelId: string, prazo: string) {
  return executar(async () => {
    const { fase } = await ctxFase(faseId);
    exigir(titulo.trim(), 'Descreva a tarefa.');
    await db.insert(t.tarefas).values({ iniciativaId: fase.iniciativaId, faseId, titulo: titulo.trim(), responsavelId: responsavelId || null, prazo: prazo || null });
  });
}

export async function alternarTarefa(tarefaId: string) {
  return executar(async () => {
    const ctx = await contexto();
    const tf = ctx.dados.tarefas.find((x) => x.id === tarefaId);
    exigir(tf, 'Tarefa não encontrada.');
    const ini = ctx.dados.iniciativas.find((i) => i.id === tf.iniciativaId);
    exigir(ini && (ini.gpId === ctx.eu.id || ctx.ehPmo || tf.responsavelId === ctx.eu.id), 'Sem permissão para esta tarefa.');
    await db.update(t.tarefas).set({ concluida: !tf.concluida }).where(eq(t.tarefas.id, tarefaId));
  });
}

export async function removerTarefa(tarefaId: string) {
  return executar(async () => {
    const ctx0 = await contexto();
    const tf = ctx0.dados.tarefas.find((x) => x.id === tarefaId);
    exigir(tf, 'Tarefa não encontrada.');
    await ctxProjeto(tf.iniciativaId);
    await db.delete(t.tarefas).where(eq(t.tarefas.id, tarefaId));
  });
}

// ---------- Alocação ----------

/** Mantém o pedido de alocação em dia: acima do cedido gera (ou atualiza) um pedido ao gestor da pessoa. */
async function sincronizarPedido(iniciativaId: string, pessoaId: string) {
  const ctx = await contexto();
  const p = pessoa(ctx.dados, pessoaId);
  if (!p || p.externo || p.cedeAte == null) return;
  const fases = fasesDo(ctx.dados, iniciativaId);
  const ini = ctx.dados.iniciativas.find((i) => i.id === iniciativaId)!;
  const allocs = await db.select().from(t.alocacoes).where(and(eq(t.alocacoes.pessoaId, pessoaId), inArray(t.alocacoes.faseId, fases.map((f) => f.id).concat(['00000000-0000-0000-0000-000000000000']))));
  const pior = allocs.sort((a, b) => b.pct - a.pct)[0];
  const pendente = ctx.dados.pedidos.find((x) => x.iniciativaId === iniciativaId && x.pessoaId === pessoaId && x.status === 'pendente');
  if (pior && pior.pct > p.cedeAte) {
    const delta = pior.pct - p.cedeAte;
    const fase = fases.find((f) => f.id === pior.faseId);
    const aPartirDe = fase && ini.inicioProjeto ? nomeMes(dataDaSemana(ini.inicioProjeto, fase.inicioSemana)) : null;
    if (pendente) await db.update(t.pedidosAlocacao).set({ deltaPct: delta, aPartirDe }).where(eq(t.pedidosAlocacao.id, pendente.id));
    else {
      await db.insert(t.pedidosAlocacao).values({ orgId: ctx.dados.org.id, iniciativaId, pessoaId, deltaPct: delta, aPartirDe, solicitadoPor: ctx.eu.id });
      await notificar(ctx.dados.org.id, [gestorDe(p, ctx.dados.areas)], `${ini.titulo} pede +${delta}% de ${p.nome}.`, '/area#capacidade');
    }
  } else if (pendente) {
    await db.update(t.pedidosAlocacao).set({ status: 'cancelado' }).where(eq(t.pedidosAlocacao.id, pendente.id));
  }
}

export async function alocarPessoa(faseId: string, pessoaId: string) {
  return executar(async () => {
    const { fase } = await ctxFase(faseId);
    exigir(pessoaId, 'Escolha a pessoa.');
    await db.insert(t.alocacoes).values({ faseId, pessoaId, pct: 20 }).onConflictDoNothing();
    await sincronizarPedido(fase.iniciativaId, pessoaId);
  });
}

export async function ajustarAlocacao(faseId: string, pessoaId: string, pct: number) {
  return executar(async () => {
    const { fase } = await ctxFase(faseId);
    const v = Math.max(10, Math.min(100, Math.round(pct / 10) * 10));
    await db.update(t.alocacoes).set({ pct: v }).where(and(eq(t.alocacoes.faseId, faseId), eq(t.alocacoes.pessoaId, pessoaId)));
    await sincronizarPedido(fase.iniciativaId, pessoaId);
  });
}

export async function removerAlocacao(faseId: string, pessoaId: string) {
  return executar(async () => {
    const { fase } = await ctxFase(faseId);
    await db.delete(t.alocacoes).where(and(eq(t.alocacoes.faseId, faseId), eq(t.alocacoes.pessoaId, pessoaId)));
    await sincronizarPedido(fase.iniciativaId, pessoaId);
  });
}

// ---------- Marcos e riscos ----------

export async function adicionarMarco(faseId: string, nome: string, data: string) {
  return executar(async () => {
    await ctxFase(faseId);
    exigir(nome.trim(), 'Dê um nome ao marco.');
    await db.insert(t.marcos).values({ faseId, nome: nome.trim(), data: data || null, status: 'Previsto' });
  });
}

export async function mudarStatusMarco(marcoId: string) {
  return executar(async () => {
    const ctx0 = await contexto();
    const m = ctx0.dados.marcos.find((x) => x.id === marcoId);
    exigir(m, 'Marco não encontrado.');
    await ctxFase(m.faseId);
    const prox = { Previsto: 'Em risco', 'Em risco': 'Atingido', Atingido: 'Previsto' }[m.status] ?? 'Previsto';
    await db.update(t.marcos).set({ status: prox }).where(eq(t.marcos.id, marcoId));
  });
}

export async function removerMarco(marcoId: string) {
  return executar(async () => {
    const ctx0 = await contexto();
    const m = ctx0.dados.marcos.find((x) => x.id === marcoId);
    exigir(m, 'Marco não encontrado.');
    await ctxFase(m.faseId);
    await db.delete(t.marcos).where(eq(t.marcos.id, marcoId));
  });
}

export async function adicionarRisco(faseId: string, nome: string, nivel: string) {
  return executar(async () => {
    await ctxFase(faseId);
    exigir(nome.trim(), 'Descreva o risco.');
    exigir(['Alto', 'Médio', 'Baixo'].includes(nivel), 'Nível inválido.');
    await db.insert(t.riscos).values({ faseId, nome: nome.trim(), nivel });
  });
}

export async function removerRisco(riscoId: string) {
  return executar(async () => {
    const ctx0 = await contexto();
    const r = ctx0.dados.riscos.find((x) => x.id === riscoId);
    exigir(r, 'Risco não encontrado.');
    await ctxFase(r.faseId);
    await db.delete(t.riscos).where(eq(t.riscos.id, riscoId));
  });
}

// ---------- Status ----------

export async function publicarStatus(iniciativaId: string, data: string, avancou: string, aSeguir: string, atencao: string) {
  return executar(async () => {
    const { dados, ini, eu } = await ctxProjeto(iniciativaId);
    exigir(data && avancou.trim(), 'Preencha a data e ao menos “O que avançou?” para publicar.');
    const fases = fasesDo(dados, ini.id).map((f) => ({ id: f.id, nome: f.nome, inicioSemana: f.inicioSemana, duracao: f.duracao }));
    const dv = desvio(fases, linhaBaseDo(dados, ini.id));
    await db.insert(t.statusReports).values({ iniciativaId: ini.id, data, farol: ini.farol ?? 'ok', desvio: rotuloDesvio(dv), avancou: avancou.trim(), aSeguir: aSeguir.trim() || '—', atencao: atencao.trim() || '—', autorId: eu.id });
    const pmos = dados.pessoas.filter((p) => p.perfis.includes('pmo')).map((p) => p.id);
    await notificar(dados.org.id, [...pmos, ini.patrocinadorId], `Novo status de "${ini.titulo}".`, `/projetos/${ini.id}#status`);
    return { ok: true, msg: 'Status publicado e enviado ao patrocinador e ao PMO.' };
  });
}
