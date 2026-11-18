import 'server-only';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { envelopeDosPeriodos, estenderUltimoPeriodo } from '@/lib/regras/projeto';

// Períodos de fase: a fase guarda o envelope (início do 1º ao fim do último período). Toda mudança de período passa por aqui.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Exec = typeof db | Tx;

/** Fases recém-criadas ganham um período com as datas delas. */
export async function criarPeriodosIniciais(ex: Exec, fases: { id: string; inicioSemana: number; duracao: number }[]) {
  if (fases.length) await ex.insert(t.fasePeriodos).values(fases.map((f) => ({ faseId: f.id, inicioSemana: f.inicioSemana, duracao: f.duracao })));
}

/** Atualiza as datas da fase pelo envelope dos períodos dela. */
export async function recalcularFase(ex: Exec, faseId: string) {
  const ps = await ex.select().from(t.fasePeriodos).where(eq(t.fasePeriodos.faseId, faseId));
  const env = envelopeDosPeriodos(ps);
  if (env) await ex.update(t.projetoFases).set(env).where(eq(t.projetoFases.id, faseId));
}

/**
 * A fase volta a ter um período só, com as datas dadas (ex.: "Recriar a partir do modelo"). As pessoas dos outros
 * períodos passam para ele (com o maior % que tinham), para ninguém sumir do projeto.
 */
export async function unificarPeriodos(ex: Exec, faseId: string, inicioSemana: number, duracao: number) {
  const ps = await ex.select().from(t.fasePeriodos).where(eq(t.fasePeriodos.faseId, faseId)).orderBy(asc(t.fasePeriodos.inicioSemana), asc(t.fasePeriodos.createdAt));
  if (!ps.length) { await criarPeriodosIniciais(ex, [{ id: faseId, inicioSemana, duracao }]); return; }
  const [fica, ...outros] = ps;
  if (outros.length) {
    const doOutros = await ex.select().from(t.alocacoes).where(inArray(t.alocacoes.periodoId, outros.map((p) => p.id)));
    const ficam = await ex.select().from(t.alocacoes).where(eq(t.alocacoes.periodoId, fica.id));
    for (const a of doOutros) {
      const atual = ficam.find((x) => x.pessoaId === a.pessoaId);
      if (!atual) { await ex.insert(t.alocacoes).values({ faseId, periodoId: fica.id, pessoaId: a.pessoaId, pct: a.pct }); ficam.push({ ...a, periodoId: fica.id }); }
      else if (a.pct > atual.pct) { await ex.update(t.alocacoes).set({ pct: a.pct }).where(eq(t.alocacoes.id, atual.id)); atual.pct = a.pct; }
    }
    await ex.delete(t.fasePeriodos).where(and(eq(t.fasePeriodos.faseId, faseId), ne(t.fasePeriodos.id, fica.id)));
  }
  await ex.update(t.fasePeriodos).set({ inicioSemana, duracao }).where(eq(t.fasePeriodos.id, fica.id));
  await ex.update(t.projetoFases).set({ inicioSemana, duracao }).where(eq(t.projetoFases.id, faseId));
}

/** Estende a fase até a semana final dada, esticando o último período (pedido de mais prazo aprovado). */
export async function estenderFase(ex: Exec, faseId: string, fimSemana: number) {
  const ps = await ex.select().from(t.fasePeriodos).where(eq(t.fasePeriodos.faseId, faseId));
  const novos = estenderUltimoPeriodo(ps, fimSemana);
  for (const p of novos) {
    const antes = ps.find((x) => x.id === p.id);
    if (antes && antes.duracao !== p.duracao) await ex.update(t.fasePeriodos).set({ duracao: p.duracao }).where(eq(t.fasePeriodos.id, p.id));
  }
  await recalcularFase(ex, faseId);
}

/** Primeiro período da fase (para quem ainda age na fase como um todo). */
export async function primeiroPeriodo(ex: Exec, faseId: string) {
  const [p] = await ex.select().from(t.fasePeriodos).where(eq(t.fasePeriodos.faseId, faseId)).orderBy(asc(t.fasePeriodos.inicioSemana), asc(t.fasePeriodos.createdAt)).limit(1);
  return p;
}
