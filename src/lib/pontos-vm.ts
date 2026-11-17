import type { DadosOrg, PontoAtencao } from './dados';
import { br } from './regras/datas';
import { podeResolverPonto, pontoAtrasado, TIPOS_PONTO } from './regras/pontos';
import { pessoa } from './visoes';

// Linha de ponto de atenção pronta para a tela.
export type PontoVM = {
  id: string; tipo: string; tipoRotulo: string; titulo: string; descricao: string; projeto: string; projetoId: string; fase: string;
  destino: string; abertoPor: string; abertoEm: string; prazo: string; atrasado: boolean; status: string;
  resolucao: string; resolvidoPor: string; resolvidoEm: string; podeResolver: boolean;
};

export function pontoVM(d: DadosOrg, p: PontoAtencao, eu: string, ehPmo: boolean, hoje: string): PontoVM {
  const ini = d.iniciativas.find((i) => i.id === p.iniciativaId);
  const dia = (x: Date | null) => (x ? br(x.toISOString().slice(0, 10)) : '');
  return {
    id: p.id, tipo: p.tipo, tipoRotulo: TIPOS_PONTO[p.tipo] ?? p.tipo, titulo: p.titulo, descricao: p.descricao,
    projeto: ini?.titulo ?? '', projetoId: p.iniciativaId, fase: d.fases.find((f) => f.id === p.faseId)?.nome ?? '',
    destino: p.destino === 'pmo' ? 'PMO' : pessoa(d, p.destinatarioId)?.nome ?? 'Gestor',
    abertoPor: pessoa(d, p.abertoPor)?.nome ?? '', abertoEm: dia(p.createdAt), prazo: p.prazo ? br(p.prazo) : '',
    atrasado: pontoAtrasado(p, hoje), status: p.status, resolucao: p.resolucao ?? '', resolvidoPor: pessoa(d, p.resolvidoPor)?.nome ?? '', resolvidoEm: dia(p.resolvidoEm),
    podeResolver: podeResolverPonto(p, eu, ehPmo),
  };
}
