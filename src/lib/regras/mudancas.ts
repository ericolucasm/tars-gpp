// Pedidos de mudança de escopo e de custo do projeto (a de prazo é a mudança de linha de base).

export const TIPOS_MUDANCA: Record<string, string> = { escopo: 'Escopo', custo: 'Custo' };

/** Valida o pedido antes de gravar. Devolve a mensagem de erro, ou null se estiver ok. */
export function validarPedidoMudanca(p: { tipo: string; descricao: string; valorNovo: number | null }, orcamentoAtual: number): string | null {
  if (!TIPOS_MUDANCA[p.tipo]) return 'Escolha se a mudança é de escopo ou de custo.';
  if (p.descricao.trim().length < 5) return 'Descreva o que muda.';
  if (p.tipo === 'custo') {
    if (p.valorNovo === null || !Number.isFinite(p.valorNovo) || p.valorNovo <= 0) return 'Informe o novo orçamento total do projeto.';
    if (Math.round(p.valorNovo) === Math.round(orcamentoAtual)) return 'O novo orçamento é igual ao atual.';
  }
  return null;
}

/** Variação de um pedido de custo em relação ao orçamento atual (em %). */
export function variacaoCusto(anterior: number, novo: number) {
  if (!anterior) return null;
  return Math.round(((novo - anterior) / anterior) * 100);
}
