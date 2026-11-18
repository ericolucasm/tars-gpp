// Balanço de encerramento do projeto: prazo, custo, escopo, riscos e benefício, comparados com o planejado.

export type ItemBalanco = { dimensao: string; planejado: string; realizado: string; tom: 'ok' | 'aten' | 'crit' | 'neutro'; leitura: string };

export function balancoPrazo(desvioSemanas: number | null): ItemBalanco['tom'] {
  if (desvioSemanas === null) return 'neutro';
  return desvioSemanas > 2 ? 'crit' : desvioSemanas > 0 ? 'aten' : 'ok';
}

export function balancoCusto(orcado: number, realizado: number): ItemBalanco['tom'] {
  if (!orcado) return 'neutro';
  return realizado > orcado * 1.1 ? 'crit' : realizado > orcado ? 'aten' : 'ok';
}

export function balancoEscopo(mudancasAprovadas: number): ItemBalanco['tom'] {
  return mudancasAprovadas >= 2 ? 'aten' : 'ok';
}

export const TIPOS_LICAO: Record<string, string> = { funcionou: 'O que funcionou', melhorar: 'O que melhorar' };

export function validarLicao(l: { tipo: string; texto: string }): string | null {
  if (!TIPOS_LICAO[l.tipo]) return 'Escolha se é algo que funcionou ou algo a melhorar.';
  if (l.texto.trim().length < 10) return 'Escreva a lição em uma frase (pelo menos 10 letras).';
  return null;
}
