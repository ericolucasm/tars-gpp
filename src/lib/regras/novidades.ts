import { addDias } from './datas';

// Novidades do Meu TARS: os avisos que o TARS manda para a pessoa (aprovações, devoluções, pedidos, conclusões…), com histórico.

export type GrupoNovidade = 'Hoje' | 'Ontem' | 'Nos últimos 7 dias' | 'Antes';
export const GRUPOS_NOVIDADE: GrupoNovidade[] = ['Hoje', 'Ontem', 'Nos últimos 7 dias', 'Antes'];

/** Em que grupo de data um aviso entra (pela data em que foi criado, AAAA-MM-DD). */
export function grupoNovidade(dia: string, hoje: string): GrupoNovidade {
  if (dia >= hoje) return 'Hoje';
  if (dia === addDias(hoje, -1)) return 'Ontem';
  if (dia >= addDias(hoje, -7)) return 'Nos últimos 7 dias';
  return 'Antes';
}

/**
 * Só a própria pessoa marca os avisos dela como lidos. No "ver como", o admin vê os avisos de quem escolheu,
 * mas não mexe no que ela leu ou não.
 */
export function podeMarcarLida(sessao: { realId: string; pessoaId: string }) {
  return sessao.realId === sessao.pessoaId;
}
