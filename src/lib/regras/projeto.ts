import { addDias, diffDias } from './datas';

// Fases são guardadas em semanas relativas ao início do projeto (segunda-feira).

export type Fase = { id: string; nome: string; inicioSemana: number; duracao: number };

export function fimDoPlano(fases: { inicioSemana: number; duracao: number }[]) {
  return fases.reduce((m, f) => Math.max(m, f.inicioSemana + f.duracao), 0);
}

export function dataDaSemana(inicioProjeto: string, semana: number) {
  return addDias(inicioProjeto, semana * 7);
}

/** Semana (fracionária) em que "hoje" cai na linha do tempo. */
export function semanaHoje(inicioProjeto: string, hoje: string) {
  return diffDias(hoje, inicioProjeto) / 7;
}

export type StatusFase = 'Concluída' | 'Em andamento' | 'Planejada';

export function statusDaFase(f: { inicioSemana: number; duracao: number }, inicioProjeto: string, hoje: string): StatusFase {
  const ini = dataDaSemana(inicioProjeto, f.inicioSemana);
  const fim = dataDaSemana(inicioProjeto, f.inicioSemana + f.duracao);
  if (fim <= hoje) return 'Concluída';
  if (ini <= hoje) return 'Em andamento';
  return 'Planejada';
}

/** Desvio em semanas do fim atual contra a linha de base (null = linha de base não congelada). */
export function desvio(fases: Fase[], base: Fase[] | null): number | null {
  if (!base) return null;
  return fimDoPlano(fases) - fimDoPlano(base);
}

export function rotuloDesvio(dv: number | null) {
  if (dv === null) return 'Linha de base não congelada';
  if (dv === 0) return 'No prazo';
  return dv > 0 ? `+${dv} semana(s)` : `${dv} semana(s)`;
}

export function rotuloDesvioCurto(dv: number | null) {
  if (dv === null) return 'Não congelada';
  if (dv === 0) return 'No prazo';
  return dv > 0 ? `+${dv} sem.` : `${dv} sem.`;
}

export type Farol = 'ok' | 'aten' | 'crit';

export const FAROL: Record<Farol, { rotulo: string; bg: string; fg: string }> = {
  ok: { rotulo: 'OK', bg: '#E3F5EA', fg: '#17723D' },
  aten: { rotulo: 'Atenção', bg: '#FEF3DC', fg: '#9A5B05' },
  crit: { rotulo: 'Crítico', bg: '#FDE8E8', fg: '#B42318' },
};

/** Farol sugerido pelo TARS (o GP decide o farol final). */
export function farolSugerido(dv: number | null, pessoasAcima: number): { farol: Farol; porque: string } {
  if (dv !== null && dv > 2) return { farol: 'crit', porque: `fim ${dv} semanas após a linha de base` };
  if (dv !== null && dv > 0) return { farol: 'aten', porque: `fim ${dv} semana(s) após a linha de base` };
  if (dv === null) return { farol: 'aten', porque: 'linha de base ainda não congelada' };
  if (pessoasAcima > 0) return { farol: 'aten', porque: `${pessoasAcima} pessoa(s) acima do cedido` };
  return { farol: 'ok', porque: 'dentro do planejado' };
}

export function progresso(tarefas: { concluida: boolean }[]) {
  if (!tarefas.length) return 0;
  return Math.round((tarefas.filter((t) => t.concluida).length / tarefas.length) * 100);
}

export function tarefaAtrasada(t: { concluida: boolean; prazo: string | null }, hoje: string) {
  return !t.concluida && !!t.prazo && t.prazo < hoje;
}

/** Gera as fases de um modelo em sequência a partir da semana 0. */
export function fasesDoModelo(biblioteca: { nome: string; duracaoSemanas: number; criterioConclusao: string }[]) {
  let s = 0;
  return biblioteca.map((f, i) => {
    const fase = { nome: f.nome, inicioSemana: s, duracao: f.duracaoSemanas, ordem: i, criterioConclusao: f.criterioConclusao };
    s += f.duracaoSemanas;
    return fase;
  });
}

/** Cabeçalho de meses da linha do tempo: [rótulo, nº de semanas]. */
export function mesesDaLinha(inicioProjeto: string, semanas: number): [string, number][] {
  const NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const res: [string, number][] = [];
  let ultimoAno = -1;
  for (let w = 0; w < semanas; w++) {
    const d = dataDaSemana(inicioProjeto, w);
    const m = Number(d.slice(5, 7)) - 1;
    const y = Number(d.slice(0, 4));
    const chave = `${y}-${m}`;
    const last = res[res.length - 1] as ([string, number] & { k?: string }) | undefined;
    if (last && last.k === chave) { last[1]++; continue; }
    const rotulo = y !== ultimoAno ? `${NOMES[m]} ${y}` : NOMES[m];
    ultimoAno = y;
    const novo = [rotulo, 1] as [string, number] & { k?: string };
    novo.k = chave;
    res.push(novo);
  }
  return res.map(([r, n]) => [r, n]);
}

/** Descreve a diferença entre a linha de base e o plano proposto: "+2 semanas em Testes". */
export function descreverMudanca(base: Fase[], nova: Fase[]): string {
  const partes: string[] = [];
  for (const f of nova) {
    const b = base.find((x) => x.id === f.id);
    if (!b) { partes.push(`nova fase ${f.nome}`); continue; }
    const dFim = (f.inicioSemana + f.duracao) - (b.inicioSemana + b.duracao);
    if (dFim !== 0) partes.push(`${dFim > 0 ? '+' : ''}${dFim} semana${Math.abs(dFim) === 1 ? '' : 's'} em ${f.nome}`);
  }
  for (const b of base) if (!nova.find((x) => x.id === b.id)) partes.push(`remove ${b.nome}`);
  return partes.length ? partes.join(', ') : 'ajuste de datas sem mudança no fim';
}
