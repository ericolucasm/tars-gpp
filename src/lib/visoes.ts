import type { DadosOrg, Iniciativa, Pessoa, ProjetoFase } from './dados';
import { addDias, br, brCurto, diffDias, haQuanto, nomeMes } from './regras/datas';
import { dataDaSemana, desvio, fimDoPlano, progresso, statusDaFase, tarefaAtrasada, type Fase } from './regras/projeto';
import { acimaDoCedido, gestorDe, nomeCurto } from './regras/pessoas';
import { custoReferencia, notaFinal } from './regras/avaliacao';

// Cálculos derivados usados por várias telas. Tudo a partir de DadosOrg (a "foto" da empresa).

export function idx<T extends { id: string }>(lista: T[]) {
  return new Map(lista.map((x) => [x.id, x]));
}

export function raiaChave(d: DadosOrg, chave: string) {
  return d.raias.find((r) => r.chave === chave);
}

export function chaveDaRaia(d: DadosOrg, raiaId: string) {
  return d.raias.find((r) => r.id === raiaId)?.chave ?? null;
}

export function noRaia(d: DadosOrg, i: Iniciativa, ...chaves: string[]) {
  const c = chaveDaRaia(d, i.raiaId);
  return !!c && chaves.includes(c);
}

export function pessoa(d: DadosOrg, id: string | null | undefined) {
  return id ? d.pessoas.find((p) => p.id === id) : undefined;
}

export function nomeArea(d: DadosOrg, id: string | null | undefined) {
  return id ? d.areas.find((a) => a.id === id)?.nome ?? '' : '';
}

/** Ciclo em andamento (não planejado, não encerrado). */
export function cicloAtual(d: DadosOrg) {
  return d.ciclos.filter((c) => ['inscricoes', 'avaliacao', 'comunicado'].includes(c.etapa)).sort((a, b) => b.ano - a.ano)[0];
}

export function cicloAberto(d: DadosOrg) {
  return d.ciclos.find((c) => c.etapa === 'inscricoes');
}

export function aprovadorDe(d: DadosOrg, p: Pessoa) {
  return gestorDe(p, d.areas);
}

// ---------- Projetos ----------

export function fasesDo(d: DadosOrg, iniId: string): ProjetoFase[] {
  return d.fases.filter((f) => f.iniciativaId === iniId).sort((a, b) => a.ordem - b.ordem || a.inicioSemana - b.inicioSemana);
}

export function linhaBaseDo(d: DadosOrg, iniId: string): Fase[] | null {
  return d.linhasBase.find((b) => b.iniciativaId === iniId)?.fases ?? null;
}

export function infoProjeto(d: DadosOrg, ini: Iniciativa, hoje: string) {
  const fases = fasesDo(d, ini.id);
  const inicio = ini.inicioProjeto ?? hoje;
  const tarefas = d.tarefas.filter((t) => t.iniciativaId === ini.id);
  const faseIds = new Set(fases.map((f) => f.id));
  const marcos = d.marcos.filter((m) => faseIds.has(m.faseId)).sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
  const riscos = d.riscos.filter((r) => faseIds.has(r.faseId));
  const base = linhaBaseDo(d, ini.id);
  const dv = desvio(fases, base);
  const atual = fases.find((f) => statusDaFase(f, inicio, hoje) === 'Em andamento') ?? fases.find((f) => statusDaFase(f, inicio, hoje) === 'Planejada') ?? fases[fases.length - 1];
  const reports = d.reports.filter((r) => r.iniciativaId === ini.id).sort((a, b) => b.data.localeCompare(a.data));
  const ultimo = reports[0];
  const referenciaStatus = ultimo?.data ?? (ini.playEm ? ini.playEm.toISOString().slice(0, 10) : inicio);
  const statusAtrasado = diffDias(hoje, referenciaStatus) > 7;
  const proximoMarco = marcos.find((m) => m.status !== 'Atingido');
  return {
    fases, tarefas, marcos, riscos, base, desvio: dv, faseAtual: atual,
    progresso: progresso(tarefas),
    fimPrevisto: dataDaSemana(inicio, fimDoPlano(fases)),
    ultimoStatus: ultimo, statusAtrasado,
    proximoMarco,
    atrasadas: tarefas.filter((t) => tarefaAtrasada(t, hoje)),
  };
}

// ---------- Capacidade ----------

type Intervalo = { ini: string; fim: string; pct: number; projeto: Iniciativa };

function intervalosDaPessoa(d: DadosOrg, pessoaId: string, hoje: string): Intervalo[] {
  const exe = raiaChave(d, 'exe')?.id;
  const faseMap = idx(d.fases);
  const iniMap = idx(d.iniciativas);
  const res: Intervalo[] = [];
  for (const a of d.alocacoes) {
    if (a.pessoaId !== pessoaId) continue;
    const f = faseMap.get(a.faseId);
    const ini = f && iniMap.get(f.iniciativaId);
    if (!f || !ini || ini.raiaId !== exe || !ini.inicioProjeto) continue;
    const fim = dataDaSemana(ini.inicioProjeto, f.inicioSemana + f.duracao);
    if (fim <= hoje) continue; // fase já terminou
    res.push({ ini: dataDaSemana(ini.inicioProjeto, f.inicioSemana), fim, pct: a.pct, projeto: ini });
  }
  return res;
}

/** Alocação de uma pessoa = pico de alocação simultânea nas fases ainda não concluídas de projetos em execução. */
export function alocacaoDe(d: DadosOrg, pessoaId: string, hoje: string): number {
  const iv = intervalosDaPessoa(d, pessoaId, hoje);
  const pontos = new Set([hoje, ...iv.map((x) => (x.ini > hoje ? x.ini : hoje))]);
  let pico = 0;
  for (const t of pontos) {
    const soma = iv.filter((x) => x.ini <= t && x.fim > t).reduce((s, x) => s + x.pct, 0);
    pico = Math.max(pico, soma);
  }
  return pico;
}

/** Projetos em que a pessoa está alocada, com o % da fase atual (ou da próxima): "Roteirização (20%)". */
export function projetosDaPessoa(d: DadosOrg, pessoaId: string, hoje: string) {
  const iv = intervalosDaPessoa(d, pessoaId, hoje).sort((a, b) => a.ini.localeCompare(b.ini));
  const porProjeto = new Map<string, { projeto: Iniciativa; pct: number }>();
  for (const x of iv) if (!porProjeto.has(x.projeto.id)) porProjeto.set(x.projeto.id, { projeto: x.projeto, pct: x.pct });
  return [...porProjeto.values()];
}

export function nomeCurtoProjeto(titulo: string) {
  return titulo.split(/\s+/)[0];
}

export function pessoasAcimaDoCedido(d: DadosOrg, hoje: string, filtro?: (p: Pessoa) => boolean) {
  return d.pessoas
    .filter((p) => !p.externo && (!filtro || filtro(p)))
    .map((p) => ({ pessoa: p, alocacao: alocacaoDe(d, p.id, hoje) }))
    .filter((x) => acimaDoCedido(x.alocacao, x.pessoa.cedeAte, x.pessoa.externo));
}

// ---------- Cards e textos ----------

export function custoDe(i: Iniciativa) {
  return custoReferencia(i.faixaCusto, i.custoEstimado);
}

/** Linha de contexto dos cards do portfólio. */
export function subDoCard(d: DadosOrg, i: Iniciativa, hoje: string): string {
  const c = chaveDaRaia(d, i.raiaId);
  const sol = pessoa(d, i.solicitanteId);
  const dia = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : null);
  if (c === 'sol') {
    if (i.solStatus === 'aguardando_pmo') {
      if (!i.cicloId && i.urgencia === 'urg' && i.justificativaUrgencia) return `Entrada urgente: ${i.justificativaUrgencia.charAt(0).toLowerCase()}${i.justificativaUrgencia.slice(1)}`;
      return `Aprovada pelo gestor ${haQuanto(dia(i.aprovadaGestorEm), hoje)}`;
    }
    if (i.solStatus === 'devolvida') return `Devolvida para ajuste ${haQuanto(dia(i.devolvidaEm), hoje)}`;
    return `Enviada por ${sol ? nomeCurto(sol.nome) : '—'} ${haQuanto(dia(i.enviadaEm), hoje)}`;
  }
  if (c === 'bkl') return i.esforco ? `Esforço estimado: ${i.esforco}` : `Classificada ${haQuanto(dia(i.classificadaEm), hoje)}`;
  if (c === 'pre') return i.preAprovadaEm ? `Pré-aprovada em ${brCurto(dia(i.preAprovadaEm))}` : 'Pré-aprovada';
  if (c === 'exe' || (c === null && i.gpId)) {
    const info = infoProjeto(d, i, hoje);
    const gp = pessoa(d, i.gpId);
    const partes = [];
    if (info.desvio && info.desvio > 0) partes.push(`${info.desvio} semana(s) de atraso`);
    else partes.push(`GP: ${gp ? nomeCurto(gp.nome) : '—'}`);
    partes.push(`fim previsto ${brCurto(info.fimPrevisto)}`);
    if (info.riscos.length) partes.push(`${info.riscos.length} ${info.riscos.length === 1 ? 'risco aberto' : 'riscos abertos'}`);
    return partes.join(' · ');
  }
  if (c === 'pau') return i.retomadaPrevista ? `Retomada prevista em ${nomeMes(i.retomadaPrevista)}` : 'Pausado';
  if (c === 'con') return i.concluidaEm ? `Entregue em ${brCurto(dia(i.concluidaEm))}` : 'Entregue';
  if (c === 'can') return i.motivoSaida ? `Motivo: ${i.motivoSaida}` : 'Motivo registrado';
  return '';
}

export function situacaoDoCard(d: DadosOrg, i: Iniciativa): string {
  const c = chaveDaRaia(d, i.raiaId);
  if (c === 'sol') {
    if (i.solStatus === 'aguardando_gestor') return 'Aguardando gestor';
    if (i.solStatus === 'aguardando_pmo') return 'Aguardando avaliação do PMO';
    if (i.solStatus === 'devolvida') return 'Devolvida ao solicitante';
  }
  return i.situacao ?? '';
}

/** Rótulo do ciclo do card de solicitação: "Ciclo 2027" ou "Fora do ciclo · obrigatória". */
export function rotuloCiclo(d: DadosOrg, i: Iniciativa) {
  const c = d.ciclos.find((x) => x.id === i.cicloId);
  if (c) return `Ciclo ${c.ano}`;
  return i.tipo === 'obr' ? 'Fora do ciclo · obrigatória' : i.urgencia === 'urg' ? 'Fora do ciclo · urgente' : 'Aguardando ciclo';
}

export const TIPOS: Record<string, { rotulo: string; desc: string }> = {
  est: { rotulo: 'Estratégica', desc: 'Faz a empresa crescer ou mudar' },
  mel: { rotulo: 'Melhoria', desc: 'Deixa um processo melhor' },
  obr: { rotulo: 'Obrigatória', desc: 'Lei, norma ou auditoria' },
  man: { rotulo: 'Manutenção', desc: 'Mantém algo funcionando' },
};

export const URGENCIAS: Record<string, string> = { esp: 'Pode esperar o ciclo', ano: 'Precisa ser neste ano', urg: 'Urgente ou obrigatória' };

// ---------- Avaliação ----------

/** Iniciativas na mesa do PMO: do ciclo atual ou fora do ciclo, aprovadas pelo gestor ou paradas no backlog. */
export function listaAvaliacao(d: DadosOrg) {
  const ciclo = cicloAtual(d);
  if (!ciclo) return { ciclo: undefined, itens: [] };
  const itens = d.iniciativas.filter((i) => {
    const doCiclo = i.cicloId === ciclo.id || !i.cicloId;
    if (!doCiclo) return false;
    const c = chaveDaRaia(d, i.raiaId);
    const av = d.avaliacoes.find((a) => a.iniciativaId === i.id && a.cicloId === ciclo.id);
    if (av?.comunicado) return c === 'bkl';
    return (c === 'sol' && i.solStatus === 'aguardando_pmo') || c === 'bkl';
  }).map((i) => {
    const av = d.avaliacoes.find((a) => a.iniciativaId === i.id && a.cicloId === ciclo.id);
    const notas = av?.notas ?? [0, 0, 0, 0];
    const decisao = (av?.decisao ?? (i.tipo === 'obr' ? 'pre' : null)) as 'pre' | 'bkl' | 'rec' | null;
    return { ini: i, notas, decisao, motivoRecusa: av?.motivoRecusa ?? null, comunicado: !!av?.comunicado, nota: notaFinal(notas, d.org.config.pesos) };
  });
  return { ciclo, itens };
}

// ---------- Datas auxiliares ----------

export function proximosDias(hoje: string, n: number) {
  return { de: hoje, ate: addDias(hoje, n) };
}

export { br, brCurto };
