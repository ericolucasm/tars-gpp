import { addDias } from './datas';

// Meu TARS: a caixa única do que depende da pessoa, de todos os perfis dela, em ordem de prioridade.

export type GrupoCaixa = 'atrasado' | 'hoje' | 'esperando' | 'semana' | 'fazer' | 'depois' | 'acompanhar';

export const GRUPOS_CAIXA: { chave: GrupoCaixa; titulo: string; dica: string }[] = [
  { chave: 'atrasado', titulo: 'Atrasado', dica: 'Já venceu: resolva, peça mais prazo ou avise.' },
  { chave: 'hoje', titulo: 'Vence hoje', dica: '' },
  { chave: 'esperando', titulo: 'Alguém está esperando por você', dica: 'Decisões e respostas que travam outras pessoas.' },
  { chave: 'semana', titulo: 'Nos próximos 7 dias', dica: '' },
  { chave: 'fazer', titulo: 'Para fazer', dica: 'Sem data, mas é com você.' },
  { chave: 'depois', titulo: 'Mais adiante', dica: '' },
  { chave: 'acompanhar', titulo: 'Para acompanhar', dica: 'Alertas do que você acompanha.' },
];

export type Prioridade = { vence?: string | null; atrasado?: boolean; bloqueia?: boolean; fazer?: boolean };

/**
 * Em que grupo um item entra: atrasado → vence hoje → alguém esperando (trava outra pessoa) → próximos 7 dias →
 * para fazer (sem data) → mais adiante → para acompanhar (alertas sem ação direta).
 */
export function grupoDoItem(p: Prioridade, hoje: string): GrupoCaixa {
  if (p.atrasado || (p.vence && p.vence < hoje)) return 'atrasado';
  if (p.vence === hoje) return 'hoje';
  if (p.bloqueia) return 'esperando';
  if (p.vence && p.vence <= addDias(hoje, 7)) return 'semana';
  if (p.fazer) return 'fazer';
  if (p.vence) return 'depois';
  return 'acompanhar';
}

/** Ordena: pelo grupo e, dentro dele, pela data (sem data por último), mantendo a ordem original no empate. */
export function ordenarCaixa<T extends Prioridade>(itens: T[], hoje: string): (T & { grupo: GrupoCaixa })[] {
  const ordem = new Map(GRUPOS_CAIXA.map((g, i) => [g.chave, i]));
  return itens.map((x, i) => ({ ...x, grupo: grupoDoItem(x, hoje), i }))
    .sort((a, b) => ordem.get(a.grupo)! - ordem.get(b.grupo)! || (a.vence ?? '9999').localeCompare(b.vence ?? '9999') || a.i - b.i)
    .map(({ i: _i, ...x }) => x as T & { grupo: GrupoCaixa });
}
