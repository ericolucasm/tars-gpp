import { farolSugerido, type Farol } from './projeto';

// Farol por dimensão: o TARS sugere um farol para prazo, custo, escopo e riscos.
// O farol geral sugerido é o pior deles; o GP continua escolhendo o farol final.

export type Dimensao = { chave: 'prazo' | 'custo' | 'escopo' | 'riscos'; nome: string; farol: Farol; porque: string };
const PESO: Record<Farol, number> = { ok: 0, aten: 1, crit: 2 };

/** Prazo e recursos: desvio da linha de base e pessoas acima do cedido (mesma regra do farol sugerido de sempre). */
export function dimPrazo(desvioSemanas: number | null, pessoasAcima: number): Dimensao {
  const s = farolSugerido(desvioSemanas, pessoasAcima);
  return { chave: 'prazo', nome: 'Prazo', farol: s.farol, porque: s.porque };
}

/** Custo: situação do financeiro (estouro, previsão acima do orçado, dentro). */
export function dimCusto(situacao: Farol, orcado: number, desvioPct: number): Dimensao {
  if (!orcado) return { chave: 'custo', nome: 'Custo', farol: 'aten', porque: 'orçamento não definido' };
  if (situacao === 'crit') return { chave: 'custo', nome: 'Custo', farol: 'crit', porque: desvioPct > 0 ? `previsão ${desvioPct}% acima do orçado` : 'gasto acima do orçado' };
  if (situacao === 'aten') return { chave: 'custo', nome: 'Custo', farol: 'aten', porque: `previsão ${desvioPct}% acima do orçado` };
  return { chave: 'custo', nome: 'Custo', farol: 'ok', porque: 'dentro do orçamento' };
}

/** Escopo: pedido de mudança aguardando o PMO, ou escopo que já mudou várias vezes. */
export function dimEscopo(pendentes: number, aprovadas: number): Dimensao {
  if (pendentes > 0) return { chave: 'escopo', nome: 'Escopo', farol: 'aten', porque: 'mudança de escopo aguardando o PMO' };
  if (aprovadas >= 2) return { chave: 'escopo', nome: 'Escopo', farol: 'aten', porque: `escopo mudou ${aprovadas} vezes` };
  return { chave: 'escopo', nome: 'Escopo', farol: 'ok', porque: aprovadas === 1 ? '1 mudança aprovada' : 'sem mudanças de escopo' };
}

/** Riscos e impedimentos: riscos altos abertos e impedimentos (pontos de atenção) abertos ou atrasados. */
export function dimRiscos(riscosAltos: number, impedimentosAbertos: number, impedimentosAtrasados: number): Dimensao {
  const partes: string[] = [];
  if (riscosAltos) partes.push(`${riscosAltos} risco(s) alto(s)`);
  if (impedimentosAbertos) partes.push(`${impedimentosAbertos} impedimento(s) aberto(s)${impedimentosAtrasados ? `, ${impedimentosAtrasados} atrasado(s)` : ''}`);
  const farol: Farol = riscosAltos >= 2 || impedimentosAtrasados > 0 ? 'crit' : riscosAltos >= 1 || impedimentosAbertos > 0 ? 'aten' : 'ok';
  return { chave: 'riscos', nome: 'Riscos', farol, porque: partes.length ? partes.join(' · ') : 'sem riscos altos nem impedimentos' };
}

/** Farol geral sugerido: o pior entre as dimensões, explicando quais puxaram para baixo. */
export function farolGeral(dims: Dimensao[]): { farol: Farol; porque: string } {
  const pior = dims.reduce<Farol>((p, d) => (PESO[d.farol] > PESO[p] ? d.farol : p), 'ok');
  if (pior === 'ok') return { farol: 'ok', porque: 'prazo, custo, escopo e riscos dentro do planejado' };
  const culpadas = dims.filter((d) => d.farol === pior);
  return { farol: pior, porque: culpadas.map((d) => `${d.nome.toLowerCase()}: ${d.porque}`).join(' · ') };
}
