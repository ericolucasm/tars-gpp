// Capacidade por período: quanto uma pessoa está alocada no pico de um intervalo de datas,
// e quanto da capacidade cedida de uma área está usada.

export type Intervalo = { ini: string; fim: string; pct: number }; // fim exclusivo (AAAA-MM-DD)

/** Pico de alocação simultânea dentro de [de, ate) — a soma dos % das fases que se sobrepõem. */
export function picoNoPeriodo(iv: Intervalo[], de: string, ate: string): number {
  const dentro = iv.filter((x) => x.ini < ate && x.fim > de);
  const pontos = new Set([de, ...dentro.map((x) => (x.ini > de ? x.ini : de))]);
  let pico = 0;
  for (const t of pontos) pico = Math.max(pico, dentro.filter((x) => x.ini <= t && x.fim > t).reduce((s, x) => s + x.pct, 0));
  return pico;
}

/** Situação da área no período: usado/cedido acima de 100% → crítico; acima de 85% → atenção. */
export function situacaoCapacidade(alocado: number, cedido: number): 'ok' | 'aten' | 'crit' {
  if (alocado > cedido) return 'crit';
  if (cedido > 0 && alocado / cedido > 0.85) return 'aten';
  return 'ok';
}

/** "1,2" pessoas-equivalentes a partir de % somados (100% = uma pessoa em tempo integral). */
export function pessoasEq(pct: number) {
  return (pct / 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export type MesImpacto = { de: string; carga: number; doProjeto: number; situacao: 'ok' | 'so_com_pedido' | 'acima' };

/**
 * Impacto de ceder uma pessoa, mês a mês: a carga total (pico de alocação no mês, todos os projetos),
 * quanto disso é do projeto que pede, e se cabe no limite atual, só com o pedido ou nem com ele.
 */
export function impactoPorMes(todos: Intervalo[], doProjeto: Intervalo[], meses: { de: string; ate: string }[], limiteAtual: number, limiteNovo: number): MesImpacto[] {
  return meses.map((m) => {
    const carga = picoNoPeriodo(todos, m.de, m.ate);
    const situacao = carga > limiteNovo ? 'acima' : carga > limiteAtual ? 'so_com_pedido' : 'ok';
    return { de: m.de, carga, doProjeto: picoNoPeriodo(doProjeto, m.de, m.ate), situacao };
  });
}
