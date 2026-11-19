// Filtros da tela Projetos (PMO e GP). Regras puras: a tela monta o resumo de cada projeto e aplica os filtros aqui.

export type SituacaoProjeto = 'exe' | 'pau' | 'con';

export type ResumoFiltravel = {
  titulo: string;
  areaId: string | null;
  gpId: string | null;
  situacao: SituacaoProjeto;
  farol: string | null; // ok | aten | crit (só conta em execução e pausados)
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD: entrega (concluídos) ou fim previsto
};

export type FiltroProjetos = {
  busca?: string;
  area?: string;
  gp?: string;
  situacao?: string;
  farol?: string;
  de?: string;
  ate?: string;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const SITUACOES = ['exe', 'pau', 'con'];
const FAROIS = ['ok', 'aten', 'crit'];

/** Normaliza o que vem do endereço: descarta valores inválidos e inverte o período se vier ao contrário. */
export function normalizarFiltro(f: Record<string, string | string[] | undefined>): FiltroProjetos {
  const v = (k: string) => { const x = f[k]; const t = (Array.isArray(x) ? x[0] : x)?.trim(); return t ? t : undefined; };
  let de = v('de'); let ate = v('ate');
  if (de && !DATA.test(de)) de = undefined;
  if (ate && !DATA.test(ate)) ate = undefined;
  if (de && ate && de > ate) [de, ate] = [ate, de];
  const situacao = v('situacao'); const farol = v('farol');
  return {
    busca: v('busca'), area: v('area'), gp: v('gp'),
    situacao: situacao && SITUACOES.includes(situacao) ? situacao : undefined,
    farol: farol && FAROIS.includes(farol) ? farol : undefined,
    de, ate,
  };
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Um projeto passa no filtro quando atende a todos os critérios preenchidos:
 * - busca: parte do nome, sem diferenciar maiúsculas nem acentos;
 * - área, GP, situação: igualdade;
 * - farol: só projetos em execução ou pausados (concluídos não têm farol);
 * - período (de/até): o projeto esteve ativo em algum dia do período, ou seja, [início, fim] cruza [de, até].
 */
export function passaNoFiltro(p: ResumoFiltravel, f: FiltroProjetos) {
  if (f.busca && !semAcento(p.titulo).includes(semAcento(f.busca))) return false;
  if (f.area && p.areaId !== f.area) return false;
  if (f.gp && p.gpId !== f.gp) return false;
  if (f.situacao && p.situacao !== f.situacao) return false;
  if (f.farol && (p.situacao === 'con' || (p.farol ?? 'ok') !== f.farol)) return false;
  if (f.de && p.fim < f.de) return false;
  if (f.ate && p.inicio > f.ate) return false;
  return true;
}

export function filtroAtivo(f: FiltroProjetos) {
  return Object.values(f).some(Boolean);
}
