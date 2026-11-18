import { addDias, diffDias } from './datas';

// Ausências do time (férias, licenças…): reduzem a capacidade no período e avisam o GP de quem está alocado.

export const MOTIVOS_AUSENCIA = ['Férias', 'Licença', 'Treinamento', 'Outro'];

export type AusenciaR = { inicio: string; fim: string }; // fim inclusive

/** Dias de ausência dentro de [de, ate) — sobreposições contam uma vez só. */
export function diasAusente(aus: AusenciaR[], de: string, ate: string): number {
  const dias = new Set<string>();
  for (const a of aus) {
    let x = a.inicio > de ? a.inicio : de;
    const fimExcl = addDias(a.fim, 1);
    const lim = fimExcl < ate ? fimExcl : ate;
    while (x < lim) { dias.add(x); x = addDias(x, 1); }
  }
  return dias.size;
}

/** Fração do período [de, ate) em que a pessoa está fora (0 a 1). */
export function fracaoAusente(aus: AusenciaR[], de: string, ate: string): number {
  const total = diffDias(ate, de);
  return total > 0 ? diasAusente(aus, de, ate) / total : 0;
}

/** A ausência cruza o intervalo [ini, fimExcl)? */
export function cruza(a: AusenciaR, ini: string, fimExcl: string) {
  return a.inicio < fimExcl && a.fim >= ini;
}

export function validarAusencia(a: { inicio: string; fim: string; motivo: string }, hoje: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(a.inicio) || !iso.test(a.fim)) return 'Informe o início e o fim.';
  if (a.fim < a.inicio) return 'O fim precisa ser no mesmo dia ou depois do início.';
  if (a.fim < hoje) return 'A ausência já terminou. Registre só ausências atuais ou futuras.';
  if (!MOTIVOS_AUSENCIA.includes(a.motivo)) return 'Escolha o motivo.';
  return null;
}
