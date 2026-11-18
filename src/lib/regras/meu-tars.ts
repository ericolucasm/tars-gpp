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

// ---------- Planejamento pessoal (só a própria pessoa vê) ----------

export type PlanoPessoal = { plano: string | null; planejadoEm: string | null; adiadoAte: string | null };
export type PlanoEfetivo = 'hoje' | 'semana' | 'depois' | 'adiado' | null;

const segunda = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); const w = (d.getUTCDay() + 6) % 7; return addDias(iso, -w); };

/**
 * Onde o item fica hoje, pelo plano da pessoa: adiado até uma data (some até lá) → "hoje" (só no dia em que planejou;
 * no dia seguinte, se ainda for a mesma semana, vira "esta semana") → "esta semana" (só naquela semana) → "depois".
 * Fora disso, o item volta para o seu grupo de prioridade normal.
 */
export function planoEfetivo(p: PlanoPessoal | undefined, hoje: string): PlanoEfetivo {
  if (!p) return null;
  if (p.adiadoAte && p.adiadoAte > hoje) return 'adiado';
  const mesmaSemana = !!p.planejadoEm && segunda(p.planejadoEm) === segunda(hoje);
  if (p.plano === 'hoje') return p.planejadoEm === hoje ? 'hoje' : mesmaSemana ? 'semana' : null;
  if (p.plano === 'semana') return mesmaSemana ? 'semana' : null;
  if (p.plano === 'depois') return 'depois';
  return null;
}

export function validarAdiamento(ate: string, hoje: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) return 'Escolha a data do lembrete.';
  if (ate <= hoje) return 'O lembrete precisa ser para depois de hoje.';
  if (ate > addDias(hoje, 365)) return 'Escolha uma data dentro de um ano.';
  return null;
}
