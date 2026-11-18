import type { DadosOrg, Iniciativa } from './dados';
import { br } from './regras/datas';
import { ATINGIDO, podeMedirBeneficio, situacaoBeneficio } from './regras/beneficios';
import { pessoa } from './visoes';
import type { BeneficioVM } from '@/components/Beneficio';

export function beneficioVM(d: DadosOrg, i: Iniciativa, eu: string, ehPmo: boolean, hoje: string): BeneficioVM {
  return {
    id: i.id, titulo: i.titulo, href: i.inicioProjeto && (ehPmo || i.gpId === eu || i.solicitanteId === eu) ? `/projetos/${i.id}#beneficio` : null,
    indicador: i.beneficioIndicador ?? '', meta: i.beneficioMeta ?? '', medirEm: i.beneficioMedirEm ? br(i.beneficioMedirEm) : '', medirEmIso: i.beneficioMedirEm ?? '',
    situacao: situacaoBeneficio(i, hoje), resultado: i.beneficioResultado ?? '', atingido: i.beneficioAtingido ?? '', atingidoRotulo: ATINGIDO[i.beneficioAtingido ?? ''] ?? '',
    medidoPor: pessoa(d, i.beneficioMedidoPor)?.nome ?? '', medidoEm: i.beneficioMedidoEm ? br(i.beneficioMedidoEm.toISOString().slice(0, 10)) : '',
    podeEditar: ehPmo || i.gpId === eu, podeMedir: podeMedirBeneficio(i, eu, ehPmo),
  };
}

/** Benefícios com a data de medir já passada e sem resultado, que esta pessoa pode registrar. */
export function beneficiosParaMedir(d: DadosOrg, eu: string, ehPmo: boolean, hoje: string) {
  return d.iniciativas.filter((i) => i.solStatus !== 'rascunho' && situacaoBeneficio(i, hoje) === 'medir' && podeMedirBeneficio(i, eu, ehPmo));
}
