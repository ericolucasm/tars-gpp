// Benefício principal da iniciativa: indicador, meta e quando medir; depois da entrega, o resultado.

export const ATINGIDO: Record<string, string> = { sim: 'Atingido', parcial: 'Parcialmente atingido', nao: 'Não atingido' };

type B = { beneficioIndicador: string | null; beneficioMedirEm: string | null; beneficioAtingido: string | null };

/** Situação do benefício: sem definição, aguardando a data, a medir (data chegou e ninguém registrou) ou medido. */
export function situacaoBeneficio(b: B, hoje: string): 'sem' | 'aguardando' | 'medir' | 'medido' {
  if (!b.beneficioIndicador) return 'sem';
  if (b.beneficioAtingido) return 'medido';
  if (b.beneficioMedirEm && b.beneficioMedirEm <= hoje) return 'medir';
  return 'aguardando';
}

/** Quem registra a medição: quem pediu a iniciativa, o gestor que aprovou, o GP do projeto ou o PMO. */
export function podeMedirBeneficio(i: { solicitanteId: string; aprovadorId: string | null; gpId: string | null }, pessoaId: string, ehPmo: boolean) {
  return ehPmo || i.solicitanteId === pessoaId || i.aprovadorId === pessoaId || i.gpId === pessoaId;
}

export function validarMedicao(m: { resultado: string; atingido: string }): string | null {
  if (m.resultado.trim().length < 2) return 'Informe o resultado medido.';
  if (!ATINGIDO[m.atingido]) return 'Diga se a meta foi atingida.';
  return null;
}
