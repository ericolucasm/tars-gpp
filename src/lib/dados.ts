import 'server-only';
import { cache } from 'react';
import { eq, inArray } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import type { Raia } from './regras/esteira';

// Carrega a "foto" da empresa numa ida ao banco (consultas em paralelo).
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
export type FaseBiblioteca = typeof t.fasesBiblioteca.$inferSelect;
export type Modelo = typeof t.modelos.$inferSelect;

export type DadosOrg = Awaited<ReturnType<typeof carregar>>;

async function carregar(orgId: string) {
  const [org, areas, pessoas, ciclos, raias, iniciativas, fasesBiblioteca, modelos, pedidos, avaliacoes] = await Promise.all([
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
  ]);
  if (!org) throw new Error('Empresa não encontrada');

  const iniIds = iniciativas.map((i) => i.id);
  const fases = iniIds.length ? await db.select().from(t.projetoFases).where(inArray(t.projetoFases.iniciativaId, iniIds)).orderBy(t.projetoFases.ordem) : [];
  const faseIds = fases.map((f) => f.id);
  const [alocacoes, tarefas, marcos, riscos, reports, linhasBase, mudancas] = await Promise.all([
    faseIds.length ? db.select().from(t.alocacoes).where(inArray(t.alocacoes.faseId, faseIds)) : [],
    iniIds.length ? db.select().from(t.tarefas).where(inArray(t.tarefas.iniciativaId, iniIds)).orderBy(t.tarefas.prazo, t.tarefas.createdAt) : [],
    faseIds.length ? db.select().from(t.marcos).where(inArray(t.marcos.faseId, faseIds)).orderBy(t.marcos.data) : [],
    faseIds.length ? db.select().from(t.riscos).where(inArray(t.riscos.faseId, faseIds)) : [],
    iniIds.length ? db.select().from(t.statusReports).where(inArray(t.statusReports.iniciativaId, iniIds)) : [],
    iniIds.length ? db.select().from(t.linhasBase).where(inArray(t.linhasBase.iniciativaId, iniIds)) : [],
    iniIds.length ? db.select().from(t.mudancasBase).where(inArray(t.mudancasBase.iniciativaId, iniIds)) : [],
  ]);

  return {
    org, areas, pessoas, ciclos, raias: raias as unknown as (Raia & typeof raias[number])[], iniciativas, fasesBiblioteca, modelos,
    pedidos, avaliacoes, fases, alocacoes, tarefas, marcos, riscos, reports, linhasBase, mudancas,
  };
}

export const carregarOrg = cache(carregar);
