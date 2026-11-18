// Regras das decisões do gestor de área.

/** "Não seguir" com uma iniciativa exige um motivo da lista e um comentário para o solicitante. Devolve o erro, ou null se estiver ok. */
export function validarNaoSeguir(motivo: string, comentario: string, motivos: string[]): string | null {
  if (!motivos.includes(motivo)) return 'Escolha o motivo.';
  if (comentario.trim().length < 5) return 'Explique em poucas palavras por que não seguir. O solicitante vai ver esse comentário.';
  return null;
}

/** Ordem da área: primeiro as que o gestor ordenou (1, 2, 3…), depois as sem ordem, das mais antigas para as mais novas. */
export function ordenarPrioridadeArea<T extends { prioridadeArea: number | null; enviadaEm: Date | null }>(itens: T[]): T[] {
  return itens.slice().sort((a, b) => {
    const pa = a.prioridadeArea ?? Infinity, pb = b.prioridadeArea ?? Infinity;
    if (pa !== pb) return pa - pb;
    return (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0);
  });
}
