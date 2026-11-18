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

/** Reordena a lista de fases: tira a da posição `de` e coloca na posição `para`. Só muda a ordem das linhas; as datas ficam iguais. */
export function reordenar<T>(lista: T[], de: number, para: number): T[] {
  if (de < 0 || de >= lista.length) return lista.slice();
  const alvo = Math.max(0, Math.min(lista.length - 1, para));
  const nova = lista.slice();
  const [item] = nova.splice(de, 1);
  nova.splice(alvo, 0, item);
  return nova;
}

/** A nova ordem só vale se tiver exatamente as mesmas fases do projeto, sem repetir nem faltar. */
export function ordemValida(atuais: string[], nova: string[]) {
  return nova.length === atuais.length && new Set(nova).size === nova.length && nova.every((id) => atuais.includes(id));
}

/**
 * Edição de tarefa pelo GP ou PMO: título obrigatório; com um pedido de mais prazo aguardando o GP,
 * o prazo não muda por aqui (o GP decide o pedido, que é o que fica registrado no muro).
 */
export function validarEdicaoTarefa(e: { titulo: string; prazo: string; prazoAtual: string | null; pedidoPrazoPendente: boolean }): string | null {
  if (!e.titulo.trim()) return 'Descreva a tarefa.';
  if (e.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(e.prazo)) return 'Prazo inválido.';
  if (e.pedidoPrazoPendente && (e.prazo || null) !== e.prazoAtual) return 'Há um pedido de mais prazo para esta tarefa. Decida o pedido em Prazos e responsáveis.';
  return null;
}

/**
 * Como a pessoa vê a página do projeto: o GP do projeto e o PMO editam; quem participa (alocado,
 * responsável de fase ou de tarefa), quem pediu a iniciativa e o patrocinador veem em modo leitura; os demais não acessam.
 */
export function modoDoProjeto(p: { ehPmo: boolean; ehGp: boolean; participa: boolean; solicitante?: boolean; patrocinador?: boolean }): 'edicao' | 'leitura' | null {
  if (p.ehPmo || p.ehGp) return 'edicao';
  if (p.participa || p.solicitante || p.patrocinador) return 'leitura';
  return null;
}

// ---------- Painel da fase (linha expandida na linha do tempo) ----------

/** Equipe de uma fase: cada pessoa uma vez só, de 10% a 100%, em passos de 10%. */
export function validarEquipeFase(alocs: { pessoaId: string; pct: number }[]): string | null {
  const ids = alocs.map((a) => a.pessoaId);
  if (ids.some((id) => !id)) return 'Escolha a pessoa.';
  if (new Set(ids).size !== ids.length) return 'A mesma pessoa aparece duas vezes nesta fase.';
  if (alocs.some((a) => !Number.isInteger(a.pct) || a.pct < 10 || a.pct > 100 || a.pct % 10 !== 0)) return 'Use percentuais de 10% a 100%, de 10 em 10.';
  return null;
}

/** Resumo da equipe que aparece na barra da fase: "DS 50% · RS 20%". */
export function siglaEquipe(alocs: { nome: string; pct: number }[]) {
  return alocs.map((a) => `${a.nome.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()} ${a.pct}%`).join(' · ');
}

// ---------- Períodos de uma fase ----------

export type PeriodoR = { id: string; inicioSemana: number; duracao: number };

/** A fase vai do início do 1º período ao fim do último (é o que vale para o gate, o status, a linha de base e o desvio). */
export function envelopeDosPeriodos(periodos: { inicioSemana: number; duracao: number }[]) {
  if (!periodos.length) return null;
  const ini = Math.min(...periodos.map((p) => p.inicioSemana));
  const fim = Math.max(...periodos.map((p) => p.inicioSemana + p.duracao));
  return { inicioSemana: ini, duracao: Math.max(1, fim - ini) };
}

/** Novo período ("+"): começa logo depois do fim do último, com 2 semanas. */
export function novoPeriodo(periodos: { inicioSemana: number; duracao: number }[], duracao = 2) {
  const env = envelopeDosPeriodos(periodos);
  return { inicioSemana: env ? env.inicioSemana + env.duracao : 0, duracao };
}

/** Períodos em ordem de data (1º, 2º…). */
export function ordenarPeriodos<T extends { inicioSemana: number; duracao: number }>(periodos: T[]) {
  return periodos.slice().sort((a, b) => a.inicioSemana - b.inicioSemana || a.duracao - b.duracao);
}

/** Estende a fase até uma semana final: o último período é o que cresce (nunca diminui). */
export function estenderUltimoPeriodo<T extends PeriodoR>(periodos: T[], fimSemana: number): T[] {
  const ord = ordenarPeriodos(periodos);
  const ult = ord[ord.length - 1];
  if (!ult) return periodos;
  const dur = Math.max(ult.duracao, fimSemana - ult.inicioSemana);
  return periodos.map((p) => (p.id === ult.id ? { ...p, duracao: dur } : p));
}

/** Rótulo do período na tela: "1º período" (só quando a fase tem mais de um). */
export function rotuloPeriodo(indice: number, total: number) {
  return total > 1 ? `${indice + 1}º período` : '';
}
