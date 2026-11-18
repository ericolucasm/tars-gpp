// Regras das decisões do gestor de área.

/** "Não seguir" com uma iniciativa exige um motivo da lista e um comentário para o solicitante. Devolve o erro, ou null se estiver ok. */
export function validarNaoSeguir(motivo: string, comentario: string, motivos: string[]): string | null {
  if (!motivos.includes(motivo)) return 'Escolha o motivo.';
  if (comentario.trim().length < 5) return 'Explique em poucas palavras por que não seguir. O solicitante vai ver esse comentário.';
  return null;
}
