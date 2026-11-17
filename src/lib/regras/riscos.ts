// Riscos do projeto: probabilidade × impacto (1 a 3 cada), responsável, plano de resposta e status.

export const ESCALA = ['', 'Baixa', 'Média', 'Alta'] as const; // probabilidade (1..3)
export const ESCALA_IMPACTO = ['', 'Baixo', 'Médio', 'Alto'] as const;
export const STATUS_RISCO: Record<string, string> = { aberto: 'Em acompanhamento', ocorreu: 'Ocorreu (virou problema)', mitigado: 'Mitigado', encerrado: 'Encerrado' };

/** Nível pela pontuação probabilidade × impacto: 6 ou mais → Alto; 3 a 5 → Médio; até 2 → Baixo. */
export function nivelDoRisco(probabilidade: number, impacto: number): 'Alto' | 'Médio' | 'Baixo' {
  const p = probabilidade * impacto;
  return p >= 6 ? 'Alto' : p >= 3 ? 'Médio' : 'Baixo';
}

/** Risco ainda pede atenção: em acompanhamento ou que já ocorreu. Mitigado e encerrado saem das contas. */
export function riscoAtivo(status: string) {
  return status === 'aberto' || status === 'ocorreu';
}

export function validarRisco(r: { nome: string; probabilidade: number; impacto: number; status?: string }): string | null {
  if (r.nome.trim().length < 3) return 'Descreva o risco.';
  if (![1, 2, 3].includes(r.probabilidade) || ![1, 2, 3].includes(r.impacto)) return 'Escolha a probabilidade e o impacto.';
  if (r.status !== undefined && !STATUS_RISCO[r.status]) return 'Status inválido.';
  return null;
}
