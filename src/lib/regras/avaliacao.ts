export const CRITERIOS_AVALIACAO = ['Impacto', 'Urgência', 'Alinhamento', 'Facilidade'] as const;

export const FAIXAS_CUSTO = ['Até R$ 10 mil', 'R$ 10–50 mil', 'R$ 50–200 mil', 'Acima de R$ 200 mil', 'Não sei'] as const;

// Teto de cada faixa: usado no orçamento enquanto não há custo estimado (visão conservadora)
const TETO_FAIXA: Record<string, number> = {
  'Até R$ 10 mil': 10000,
  'R$ 10–50 mil': 50000,
  'R$ 50–200 mil': 200000,
  'Acima de R$ 200 mil': 200000,
  'Não sei': 0,
};

export function custoReferencia(faixa: string, custoEstimado: number | null | undefined): number {
  if (custoEstimado != null) return custoEstimado;
  return TETO_FAIXA[faixa] ?? 0;
}

/** Nota final de 0 a 100: Σ(nota × peso) ÷ 5. Retorna null se faltar alguma nota (0 = sem nota). */
export function notaFinal(notas: number[], pesos: number[]): number | null {
  if (notas.length < 4 || notas.some((n) => !n)) return null;
  let t = 0;
  for (let i = 0; i < 4; i++) t += notas[i] * pesos[i];
  return Math.round(t / 5);
}

export function somaPesos(pesos: number[]) {
  return pesos.reduce((a, b) => a + b, 0);
}

/** Ordena por nota (maior primeiro); sem nota vai para o fim. */
export function ordenarPorNota<T>(itens: T[], nota: (t: T) => number | null): T[] {
  return itens.slice().sort((a, b) => (nota(b) ?? -1) - (nota(a) ?? -1));
}

export type Decisao = 'pre' | 'bkl' | 'rec';

export function podeComunicar(decisoes: (Decisao | null)[]) {
  const semDecisao = decisoes.filter((d) => !d).length;
  return { ok: semDecisao === 0, semDecisao };
}
