// Feedback do GP sobre a contribuição de cada pessoa cedida ao projeto. Vê: o gestor da pessoa, o GP que escreveu e o PMO.

export const NIVEIS_FEEDBACK: Record<string, { rotulo: string; tom: 'ok' | 'neutro' | 'aten' }> = {
  superou: { rotulo: 'Superou o esperado', tom: 'ok' },
  atendeu: { rotulo: 'Atendeu ao esperado', tom: 'neutro' },
  abaixo: { rotulo: 'Abaixo do esperado', tom: 'aten' },
};

/** "Abaixo do esperado" exige um comentário (o gestor precisa saber o porquê para agir). */
export function validarFeedback(nivel: string, comentario: string): string | null {
  if (!NIVEIS_FEEDBACK[nivel]) return 'Escolha como foi a contribuição.';
  if (nivel === 'abaixo' && comentario.trim().length < 10) return 'Conte em poucas palavras o que faltou: o gestor vai usar isso para conversar com a pessoa.';
  return null;
}

/** Feedback pendente: a participação da pessoa no projeto terminou (fim da última fase em que estava alocada) e o GP ainda não avaliou. */
export function feedbackPendente(fimParticipacao: string | null, hoje: string, jaTem: boolean) {
  return !jaTem && !!fimParticipacao && fimParticipacao <= hoje;
}
