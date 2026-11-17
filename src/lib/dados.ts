import 'server-only';
import { cache } from 'react';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import type { Raia } from './regras/esteira';

// Carrega a "foto" da empresa numa ida ao banco: todas as consultas saem juntas, em paralelo.
// As tabelas dos projetos (fases, tarefas, alocações...) são filtradas pela empresa com uma subconsulta,
// em vez de esperar a lista de iniciativas chegar para só então pedi-las (eram 3 levas em sequência).
// Para o porte de um portfólio de PME (centenas de iniciativas) isso é simples e rápido,
// e deixa todas as telas calculando a partir da mesma base. cache() = uma vez por requisição.

export type Org = typeof t.orgs.$inferSelect;
export type Area = typeof t.areas.$inferSelect;
export type Pessoa = typeof t.pessoas.$inferSelect;
export type Ciclo = typeof t.ciclos.$inferSelect;
export type Iniciativa = typeof t.iniciativas.$inferSelect;
export type ProjetoFase = typeof t.projetoFases.$inferSelect;
export type Alocacao = typeof t.alocacoes.$inferSelect;
export type Tarefa = typeof t.tarefas.$inferSelect;
export type Marco = typeof t.marcos.$inferSelect;
export type Risco = typeof t.riscos.$inferSelect;
export type StatusReport = typeof t.statusReports.$inferSelect;
export type PedidoAlocacao = typeof t.pedidosAlocacao.$inferSelect;
export type Avaliacao = typeof t.avaliacoes.$inferSelect;
export type LinhaBase = typeof t.linhasBase.$inferSelect;
export type MudancaBase = typeof t.mudancasBase.$inferSelect;
export type PontoAtencao = typeof t.pontosAtencao.$inferSelect;
export type PedidoMudanca = typeof t.pedidosMudanca.$inferSelect;
export type LancamentoCusto = typeof t.lancamentosCusto.$inferSelect;
export type FaseBiblioteca = typeof t.fasesBiblioteca.$inferSelect;
export type Modelo = typeof t.modelos.$inferSelect;

export type DadosOrg = Awaited<ReturnType<typeof carregar>>;

async function carregar(orgId: string) {
  const iniciativasDoOrg = sql`(select id from iniciativas where org_id = ${orgId})`;
  const fasesDoOrg = sql`(select f.id from projeto_fases f join iniciativas i on i.id = f.iniciativa_id where i.org_id = ${orgId})`;
  const [
    org, areas, pessoas, ciclos, raias, iniciativas, fasesBiblioteca, modelos, pedidos, avaliacoes,
    fases, alocacoes, tarefas, marcos, riscos, reports, linhasBase, mudancas, pontos, pedidosMudanca, lancamentos,
  ] = await Promise.all([
    db.query.orgs.findFirst({ where: eq(t.orgs.id, orgId) }),
    db.select().from(t.areas).where(eq(t.areas.orgId, orgId)).orderBy(t.areas.ordem),
    db.select().from(t.pessoas).where(eq(t.pessoas.orgId, orgId)).orderBy(t.pessoas.seq),
    db.select().from(t.ciclos).where(eq(t.ciclos.orgId, orgId)).orderBy(t.ciclos.ano),
    db.select().from(t.raias).where(eq(t.raias.orgId, orgId)).orderBy(t.raias.ordem),
    db.select().from(t.iniciativas).where(eq(t.iniciativas.orgId, orgId)).orderBy(t.iniciativas.createdAt),
    db.select().from(t.fasesBiblioteca).where(eq(t.fasesBiblioteca.orgId, orgId)).orderBy(t.fasesBiblioteca.ordem),
    db.select().from(t.modelos).where(eq(t.modelos.orgId, orgId)),
    db.select().from(t.pedidosAlocacao).where(eq(t.pedidosAlocacao.orgId, orgId)).orderBy(t.pedidosAlocacao.createdAt),
    db.select().from(t.avaliacoes).where(eq(t.avaliacoes.orgId, orgId)),
    db.select().from(t.projetoFases).where(inArray(t.projetoFases.iniciativaId, iniciativasDoOrg)).orderBy(t.projetoFases.ordem),
    db.select().from(t.alocacoes).where(inArray(t.alocacoes.faseId, fasesDoOrg)),
    db.select().from(t.tarefas).where(inArray(t.tarefas.iniciativaId, iniciativasDoOrg)).orderBy(t.tarefas.prazo, t.tarefas.createdAt),
    db.select().from(t.marcos).where(inArray(t.marcos.faseId, fasesDoOrg)).orderBy(t.marcos.data),
    db.select().from(t.riscos).where(inArray(t.riscos.faseId, fasesDoOrg)),
    db.select().from(t.statusReports).where(inArray(t.statusReports.iniciativaId, iniciativasDoOrg)),
    db.select().from(t.linhasBase).where(inArray(t.linhasBase.iniciativaId, iniciativasDoOrg)),
    db.select().from(t.mudancasBase).where(inArray(t.mudancasBase.iniciativaId, iniciativasDoOrg)),
    db.select().from(t.pontosAtencao).where(eq(t.pontosAtencao.orgId, orgId)).orderBy(t.pontosAtencao.createdAt),
    db.select().from(t.pedidosMudanca).where(eq(t.pedidosMudanca.orgId, orgId)).orderBy(t.pedidosMudanca.createdAt),
    db.select().from(t.lancamentosCusto).where(eq(t.lancamentosCusto.orgId, orgId)).orderBy(t.lancamentosCusto.data),
  ]);
  if (!org) throw new Error('Empresa não encontrada');

  // Ordem estável das alocações (antes dependia de como o banco devolvia as linhas): pela ordem do cadastro de pessoas.
  const posicao = new Map(pessoas.map((p, i) => [p.id, i]));
  alocacoes.sort((a, b) => (posicao.get(a.pessoaId) ?? 1e9) - (posicao.get(b.pessoaId) ?? 1e9));

  return {
    org, areas, pessoas, ciclos, raias: raias as unknown as (Raia & typeof raias[number])[], iniciativas, fasesBiblioteca, modelos,
    pedidos, avaliacoes, fases, alocacoes, tarefas, marcos, riscos, reports, linhasBase, mudancas, pontos, pedidosMudanca, lancamentos,
  };
}

export const carregarOrg = cache(carregar);
