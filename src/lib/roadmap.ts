import type { DadosOrg } from './dados';
import { addDias, br } from './regras/datas';
import { dataDaSemana } from './regras/projeto';
import { infoProjeto, linhaBaseDo, nomeArea, noRaia, pessoa, chaveDaRaia } from './visoes';
import { fimDoPlano } from './regras/projeto';
import { TODOS, com, filtro, naArea, opcoesArea, OPC_FAROL, type Busca, type Filtro } from './relatorios';

// Roadmap do portfólio: uma linha por projeto (ou pré-projeto com datas desejadas) no tempo.

export type LinhaRoadmap = {
  id: string; titulo: string; area: string; gp: string; etapa: string; chave: string; farol: string | null;
  inicio: string; fim: string; fimBase: string | null; estimado: boolean; href: string | null;
  marcos: { nome: string; data: string; status: string }[];
};

const mesInicio = (aaaaMm: string) => `${aaaaMm}-01`;
const mesFim = (aaaaMm: string) => addDias(`${addMes(aaaaMm, 1)}-01`, -1);
function addMes(aaaaMm: string, n: number) {
  const [a, m] = aaaaMm.split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

export function roadmap(d: DadosOrg, hoje: string, busca: Busca) {
  const fArea = filtro(busca, 'roadmap', 'area', 'Área', opcoesArea(d));
  const fEtapa = filtro(busca, 'roadmap', 'etapa', 'Etapa', [
    { valor: 'ativos', rotulo: 'Todos os ativos' }, { valor: 'exe', rotulo: 'Em execução' }, { valor: 'pau', rotulo: 'Pausados' },
    { valor: 'pre', rotulo: 'Pré-projetos' }, { valor: 'con', rotulo: 'Concluídos' }, { valor: TODOS, rotulo: 'Todos' },
  ]);
  const fFarol = filtro(busca, 'roadmap', 'farol', 'Farol', OPC_FAROL);
  const chaves = fEtapa.valor === 'ativos' ? ['exe', 'pau', 'pre'] : fEtapa.valor === TODOS ? ['exe', 'pau', 'pre', 'con'] : [fEtapa.valor];

  const linhas: LinhaRoadmap[] = [];
  const semDatas: string[] = [];
  for (const i of d.iniciativas) {
    if (!noRaia(d, i, ...chaves) || !naArea(d, i.areaId, fArea)) continue;
    if (fFarol.valor !== TODOS && i.farol !== fFarol.valor) continue;
    const chave = chaveDaRaia(d, i.raiaId) ?? '';
    const base = { id: i.id, titulo: i.titulo, area: nomeArea(d, i.areaId), gp: pessoa(d, i.gpId)?.nome ?? '', etapa: d.raias.find((r) => r.id === i.raiaId)?.nome ?? '', chave, farol: chave === 'exe' || chave === 'pau' ? i.farol : null };
    if (i.inicioProjeto) {
      const info = infoProjeto(d, i, hoje);
      const lb = linhaBaseDo(d, i.id);
      linhas.push({
        ...base, inicio: i.inicioProjeto, fim: info.fimPrevisto, fimBase: lb ? dataDaSemana(i.inicioProjeto, fimDoPlano(lb)) : null, estimado: false, href: `/projetos/${i.id}`,
        marcos: info.marcos.filter((m) => m.data).map((m) => ({ nome: m.nome, data: m.data!, status: m.status })),
      });
    } else if (i.inicioDesejado && i.entregaDesejada) {
      linhas.push({ ...base, inicio: mesInicio(i.inicioDesejado), fim: mesFim(i.entregaDesejada), fimBase: null, estimado: true, href: null, marcos: [] });
    } else semDatas.push(i.titulo);
  }
  linhas.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.titulo.localeCompare(b.titulo));

  // Janela: do mês do primeiro início (ou de hoje) ao mês do último fim, com uma folga de 1 mês
  const ini = [hoje, ...linhas.map((l) => l.inicio)].sort()[0].slice(0, 7);
  const fim = [hoje, ...linhas.flatMap((l) => [l.fim, l.fimBase ?? l.fim])].sort().reverse()[0].slice(0, 7);
  const meses: string[] = [];
  for (let m = ini; m <= addMes(fim, 1) && meses.length < 60; m = addMes(m, 1)) meses.push(m);
  return { linhas, semDatas, meses, janela: { de: mesInicio(meses[0]), ate: mesFim(meses[meses.length - 1]) }, filtros: [fArea, fEtapa, fFarol] as Filtro[], hojeBr: br(hoje) };
}
