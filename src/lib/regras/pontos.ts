// Pontos de atenção: impedimento ou decisão escalados por quem está no projeto ao PMO ou a um gestor.

export type PontoRegra = { status: string; destino: string; destinatarioId: string | null; abertoPor: string | null; prazo: string | null };

export const TIPOS_PONTO: Record<string, string> = { impedimento: 'Impedimento', decisao: 'Decisão necessária' };

/** Quem decide: o PMO (sempre pode) ou o gestor escolhido. Quem abriu pode retirar o ponto (marcar como resolvido). */
export function podeResolverPonto(p: PontoRegra, pessoaId: string, ehPmo: boolean) {
  if (p.status !== 'aberto') return false;
  if (ehPmo || p.abertoPor === pessoaId) return true;
  return p.destino !== 'pmo' && p.destinatarioId === pessoaId; // gestor escolhido ou GP do projeto
}

/** O ponto está esperando por esta pessoa (para o "Precisa de você")? */
export function pontoEsperaPor(p: PontoRegra, pessoaId: string, ehPmo: boolean) {
  if (p.status !== 'aberto') return false;
  return p.destino === 'pmo' ? ehPmo : p.destinatarioId === pessoaId;
}

/** Atrasado: aberto e o prazo para a resposta já passou. */
export function pontoAtrasado(p: PontoRegra, hoje: string) {
  return p.status === 'aberto' && !!p.prazo && p.prazo < hoje;
}
