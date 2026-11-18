import { addDias, diffDias } from './datas';

// Muro da vergonha: prazos de status report, de gates (fim de fase) e de tarefas, e quem passou da data sem registrar nada.

export const CADENCIAS: Record<string, { rotulo: string; dias: number }> = {
  semanal: { rotulo: 'Semanal', dias: 7 }, quinzenal: { rotulo: 'Quinzenal', dias: 14 }, mensal: { rotulo: 'Mensal (a cada 4 semanas)', dias: 28 },
};
export const DIAS_SEMANA = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta'];

/** Dia da semana ISO (1 = segunda … 7 = domingo) de uma data AAAA-MM-DD. */
export function diaDaSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Primeira data, a partir de `iso` (inclusive), que cai no dia da semana pedido. */
export function proximoDiaSemana(iso: string, dia: number) {
  let x = iso;
  while (diaDaSemana(x) !== dia) x = addDias(x, 1);
  return x;
}

/**
 * Próximo status devido: a partir do último status publicado (ou do início do projeto),
 * o dia da semana combinado depois do intervalo da cadência (semanal = a próxima ocorrência; quinzenal = a segunda; mensal = a quarta).
 */
export function proximoStatusDevido(base: string, cadencia: string, dia: number, jaPublicouAlgum: boolean) {
  const intervalo = (CADENCIAS[cadencia] ?? CADENCIAS.semanal).dias;
  // sem nenhum status ainda: o primeiro vence no primeiro dia combinado depois de uma semana do início
  return proximoDiaSemana(addDias(base, jaPublicouAlgum ? intervalo - 6 : 7), dia);
}

/** Dias de atraso (0 se ainda não venceu). Vence no fim do dia: atrasa a partir do dia seguinte. */
export function diasDeAtraso(vencimento: string, hoje: string) {
  return Math.max(0, diffDias(hoje, vencimento));
}

export type PedidoPrazoR = { tipo: string; alvoId: string; status: string };
/** Com pedido de mais prazo aguardando o GP, o item não entra no muro (o prazo está em negociação). */
export function emNegociacao(pedidos: PedidoPrazoR[], tipo: string, alvoId: string) {
  return pedidos.some((p) => p.tipo === tipo && p.alvoId === alvoId && p.status === 'pendente');
}

export function validarPedidoPrazo(p: { novoPrazo: string; motivo: string }, prazoAtual: string | null, hoje: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.novoPrazo)) return 'Informe o novo prazo.';
  if (p.novoPrazo < hoje) return 'O novo prazo não pode estar no passado.';
  if (prazoAtual && p.novoPrazo <= prazoAtual) return 'O novo prazo precisa ser depois do atual.';
  if (p.motivo.trim().length < 5) return 'Explique por que precisa de mais prazo.';
  return null;
}

/**
 * Status a publicar na Início do GP, pela cadência combinada: atrasado (o dia passou sem publicação),
 * a vencer (vence nos próximos `janela` dias) ou nada a fazer ainda.
 */
export function situacaoStatus(proximo: string, hoje: string, janela = 7): 'atrasado' | 'a_vencer' | null {
  if (proximo < hoje) return 'atrasado';
  if (proximo <= addDias(hoje, janela)) return 'a_vencer';
  return null;
}

/** "vence hoje", "vence sexta, 23/10" ou "venceu sexta, 16/10 (3 dias de atraso)". */
export function rotuloVencimentoStatus(proximo: string, hoje: string) {
  const dia = `${DIAS_SEMANA[diaDaSemana(proximo)] ?? ''}, ${proximo.slice(8, 10)}/${proximo.slice(5, 7)}`;
  if (proximo === hoje) return 'vence hoje';
  if (proximo > hoje) return `vence ${dia}`;
  const n = diasDeAtraso(proximo, hoje);
  return `venceu ${dia} (${n} ${n === 1 ? 'dia' : 'dias'} de atraso)`;
}

/** Texto curto do vencimento de uma entrega: "vence hoje", "vence em 23/10" ou "venceu em 16/10 (3 dias de atraso)". */
export function venceTextoCurto(vencimento: string, hoje: string) {
  if (vencimento === hoje) return 'vence hoje';
  const dm = `${vencimento.slice(8, 10)}/${vencimento.slice(5, 7)}`;
  if (vencimento > hoje) return `vence em ${dm}`;
  const n = diasDeAtraso(vencimento, hoje);
  return `venceu em ${dm} (${n} ${n === 1 ? 'dia' : 'dias'} de atraso)`;
}
