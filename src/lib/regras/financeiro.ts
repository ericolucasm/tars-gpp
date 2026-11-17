// Financeiro do projeto: orçado (aprovado), realizado (lançamentos) e previsão de custo no fim.

export type Tom = 'ok' | 'aten' | 'crit';

/**
 * Situação do custo pela previsão no fim:
 * - previsão acima de 110% do orçado → crítico; acima do orçado → atenção; senão ok.
 * - já ter gasto mais que o orçado também é crítico, mesmo com previsão desatualizada.
 */
export function situacaoCusto(orcado: number, realizado: number, previsao: number): Tom {
  if (!orcado) return 'ok';
  if (realizado > orcado || previsao > orcado * 1.1) return 'crit';
  if (previsao > orcado) return 'aten';
  return 'ok';
}

export function resumoFinanceiro(orcado: number, realizado: number, previsaoGp: number | null, concluidoPct: number) {
  const previsao = Math.max(previsaoGp ?? orcado, realizado); // nunca prevê gastar menos do que já gastou
  const pct = (v: number) => (orcado ? Math.round((v / orcado) * 100) : 0);
  return {
    orcado, realizado, previsao,
    consumoPct: pct(realizado), // quanto do orçamento já foi gasto
    concluidoPct, // quanto das tarefas está pronto (para comparar com o consumo)
    desvioPct: orcado ? pct(previsao) - 100 : 0, // quanto a previsão passa (ou fica abaixo) do orçado
    situacao: situacaoCusto(orcado, realizado, previsao),
  };
}
