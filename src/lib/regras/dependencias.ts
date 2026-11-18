// Dependência entre projetos: "este projeto precisa da entrega daquele até tal data".

export type SituacaoDep = 'ok' | 'sem_data' | 'risco' | 'atrasada' | 'entregue';

/**
 * - entregue: o projeto do qual se depende já foi concluído;
 * - atrasada: a data em que precisava já passou e ele não foi concluído;
 * - risco: o fim previsto dele é depois da data em que se precisa;
 * - sem_data: ele ainda não tem fim previsto (não virou projeto);
 * - ok: o fim previsto cabe na data.
 */
export function situacaoDependencia(precisaAte: string, fimPrevisto: string | null, concluido: boolean, hoje: string): SituacaoDep {
  if (concluido) return 'entregue';
  if (precisaAte < hoje) return 'atrasada';
  if (!fimPrevisto) return 'sem_data';
  return fimPrevisto > precisaAte ? 'risco' : 'ok';
}

export const ROTULO_DEP: Record<SituacaoDep, string> = { ok: 'No prazo', sem_data: 'Sem data prevista', risco: 'Em risco', atrasada: 'Atrasada', entregue: 'Entregue' };
export const TOM_DEP: Record<SituacaoDep, 'ok' | 'aten' | 'crit' | 'neutro'> = { ok: 'ok', sem_data: 'aten', risco: 'crit', atrasada: 'crit', entregue: 'ok' };
