import type { DadosOrg, Iniciativa, Pessoa } from './dados';
import type { Sessao } from './sessao';
import { br, dinheiro } from './regras/datas';
import { acimaDoCedido, areasSobGestao, subarvore, timeDireto } from './regras/pessoas';
import { rotuloDesvioCurto, FAROL, type Farol } from './regras/projeto';
import { numerosAoVivo, rotuloEtapa, type Snapshot } from './ciclo-vm';
import { pessoasEq, situacaoCapacidade } from './regras/capacidade';
import { ESCALA, ESCALA_IMPACTO, STATUS_RISCO, nivelDoRisco, riscoAtivo } from './regras/riscos';
import {
  alocacaoDe, capacidadeDaArea, chaveDaRaia, custoDe, dimensoesDo, financeiroDo, infoProjeto, proximosMeses, nomeArea, noRaia, pessoa, projetosDaPessoa, rotuloCiclo, situacaoDoCard, TIPOS,
} from './visoes';

// Relatórios de cada perfil. Tudo calculado a partir da mesma foto da empresa (carregarOrg),
// com as mesmas funções das outras telas, para os números baterem com a Início, o Portfólio e a Avaliação.
// Cada relatório tem seus filtros; o valor de cada um vem do endereço da página (ex.: ?r.saude.farol=crit),
// então dá para compartilhar o link já filtrado. Os números-resumo seguem os filtros.

export type Tom = 'ok' | 'aten' | 'crit' | 'neutro';
export type Celula = string | { texto: string; tom: Tom };
export type Opcao = { valor: string; rotulo: string };
export type Filtro = { param: string; rotulo: string; valor: string; opcoes: Opcao[] };
export type Relatorio = {
  id: string;
  titulo: string;
  descricao: string;
  filtros: Filtro[];
  resumo: { rotulo: string; valor: string; tom?: Tom }[];
  colunas: string[];
  linhas: Celula[][];
  vazio: string;
};
export type Busca = Record<string, string | string[] | undefined>;

export const TODOS = 'todos';
const nomeCurtoProjeto = (t: string) => { const k = t.indexOf(' para '); return k > 0 ? t.slice(0, k) : t; };
const dia = (x: Date | null) => (x ? br(x.toISOString().slice(0, 10)) : '—');
const ORDEM_FAROL: Record<string, number> = { crit: 0, aten: 1, ok: 2 };

/** Lê um filtro do endereço; valor desconhecido volta para a primeira opção ("todos"). */
export function filtro(busca: Busca, rel: string, chave: string, rotulo: string, opcoes: Opcao[]): Filtro {
  const param = `r.${rel}.${chave}`;
  const bruto = busca[param];
  const v = Array.isArray(bruto) ? bruto[0] : bruto;
  const valor = v && opcoes.some((o) => o.valor === v) ? v : opcoes[0].valor;
  return { param, rotulo, valor, opcoes };
}
export const com = (rotuloTodos: string, opcoes: Opcao[]): Opcao[] => [{ valor: TODOS, rotulo: rotuloTodos }, ...opcoes];

// ---------- Opções de filtro reutilizadas ----------

export const OPC_FAROL = com('Todos os faróis', [{ valor: 'crit', rotulo: 'Crítico' }, { valor: 'aten', rotulo: 'Atenção' }, { valor: 'ok', rotulo: 'OK' }]);
const OPC_SITUACAO_PESSOA = com('Todas as situações', [
  { valor: 'acima', rotulo: 'Acima do cedido' }, { valor: 'dentro', rotulo: 'Dentro do limite' }, { valor: 'sem', rotulo: 'Sem projetos' },
]);

/** Áreas na ordem do cadastro; ao escolher uma área, entram também as subáreas dela. */
export function opcoesArea(d: DadosOrg, ids?: Set<string>): Opcao[] {
  return com('Todas as áreas', d.areas.filter((a) => !ids || ids.has(a.id)).map((a) => ({ valor: a.id, rotulo: a.nome })));
}
export function naArea(d: DadosOrg, areaId: string | null, f: Filtro) {
  if (f.valor === TODOS) return true;
  return !!areaId && subarvore(f.valor, d.areas).includes(areaId);
}
function opcoesCiclo(d: DadosOrg): Opcao[] {
  return com('Todos os ciclos', [
    ...d.ciclos.filter((c) => c.etapa !== 'planejado').sort((a, b) => b.ano - a.ano).map((c) => ({ valor: c.id, rotulo: c.nome })),
    { valor: 'fora', rotulo: 'Fora do ciclo' },
  ]);
}
function noCiclo(i: Iniciativa, f: Filtro) {
  if (f.valor === TODOS) return true;
  if (f.valor === 'fora') return !i.cicloId;
  return i.cicloId === f.valor;
}
function situacaoPessoa(aloc: number, p: Pessoa) {
  return acimaDoCedido(aloc, p.cedeAte, p.externo) ? 'acima' : aloc > 0 ? 'dentro' : 'sem';
}

function celFarol(f: string | null): Celula {
  if (!f || !FAROL[f as Farol]) return '—';
  return { texto: FAROL[f as Farol].rotulo, tom: f as Tom };
}
function nomeRaia(d: DadosOrg, i: Iniciativa) {
  return d.raias.find((r) => r.id === i.raiaId)?.nome ?? '';
}
const tomDesvio = (dv: number | null): Tom => (dv === null ? 'neutro' : dv > 2 ? 'crit' : dv > 0 ? 'aten' : 'ok');

// ---------- Peças comuns ----------

/** Saúde de uma lista de projetos (PMO, gestor e GP veem o mesmo formato). */
function saudeProjetos(d: DadosOrg, projetos: Iniciativa[], hoje: string, comArea: boolean): Celula[][] {
  return projetos
    .map((i) => ({ i, info: infoProjeto(d, i, hoje) }))
    .sort((a, b) => (ORDEM_FAROL[a.i.farol ?? 'ok'] ?? 3) - (ORDEM_FAROL[b.i.farol ?? 'ok'] ?? 3) || a.i.titulo.localeCompare(b.i.titulo))
    .map(({ i, info }) => [
      i.titulo,
      ...(comArea ? [nomeArea(d, i.areaId)] : []),
      pessoa(d, i.gpId)?.nome ?? '—',
      nomeRaia(d, i),
      celFarol(i.farol),
      { texto: rotuloDesvioCurto(info.desvio), tom: tomDesvio(info.desvio) },
      `${info.progresso}%`,
      br(info.fimPrevisto),
      info.ultimoStatus ? br(info.ultimoStatus.data) : { texto: 'Sem status', tom: 'aten' },
      celAlertas(dimensoesDo(d, i, hoje)),
    ]);
}
const COLUNAS_SAUDE = (comArea: boolean) => ['Projeto', ...(comArea ? ['Área'] : []), 'GP', 'Etapa', 'Farol', 'Desvio', 'Concluído', 'Fim previsto', 'Último status', 'Alertas (sugestão do TARS)'];

/** Dimensões fora do OK (prazo, custo, escopo, riscos), com a cor da pior. */
function celAlertas(dims: { nome: string; farol: string }[]): Celula {
  const ruins = dims.filter((x) => x.farol !== 'ok');
  if (!ruins.length) return { texto: 'Nenhum', tom: 'ok' };
  return { texto: ruins.map((x) => x.nome).join(', '), tom: ruins.some((x) => x.farol === 'crit') ? 'crit' : 'aten' };
}

function resumoFarol(projetos: Iniciativa[]) {
  const n = (f: string) => projetos.filter((i) => i.farol === f).length;
  return [
    { rotulo: 'Projetos', valor: String(projetos.length) },
    { rotulo: 'OK', valor: String(n('ok')), tom: 'ok' as Tom },
    { rotulo: 'Atenção', valor: String(n('aten')), tom: 'aten' as Tom },
    { rotulo: 'Crítico', valor: String(n('crit')), tom: 'crit' as Tom },
  ];
}
const filtraFarol = (lista: Iniciativa[], f: Filtro) => (f.valor === TODOS ? lista : lista.filter((i) => i.farol === f.valor));

type ComAloc = { p: Pessoa; aloc: number };

/** Alocação de pessoas: quanto podem ceder, quanto estão alocadas e em quais projetos. */
function alocacaoPessoas(d: DadosOrg, lista: ComAloc[], hoje: string, comArea: boolean): Celula[][] {
  return lista
    .map(({ p, aloc }) => ({ p, aloc, projs: projetosDaPessoa(d, p.id, hoje) }))
    .sort((a, b) => Number(situacaoPessoa(b.aloc, b.p) === 'acima') - Number(situacaoPessoa(a.aloc, a.p) === 'acima') || b.aloc - a.aloc || a.p.nome.localeCompare(b.p.nome))
    .map(({ p, aloc, projs }) => {
      const sit = situacaoPessoa(aloc, p);
      return [
        p.nome,
        ...(comArea ? [nomeArea(d, p.areaId)] : []),
        p.externo ? 'Sem limite' : `${p.cedeAte ?? 0}%`,
        `${aloc}%`,
        sit === 'acima' ? { texto: 'Acima do cedido', tom: 'crit' } : sit === 'dentro' ? { texto: 'Dentro do limite', tom: 'ok' } : { texto: 'Sem projetos', tom: 'neutro' },
        projs.length ? projs.map((x) => `${nomeCurtoProjeto(x.projeto.titulo)} (${x.pct}%)`).join(', ') : '—',
      ];
    });
}
const COLUNAS_ALOCACAO = (comArea: boolean) => ['Pessoa', ...(comArea ? ['Área'] : []), 'Pode ceder', 'Alocação', 'Situação', 'Projetos'];
function comAlocacao(d: DadosOrg, pessoas: Pessoa[], hoje: string, f: Filtro): ComAloc[] {
  return pessoas.map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje) })).filter((x) => f.valor === TODOS || situacaoPessoa(x.aloc, x.p) === f.valor);
}
function resumoAlocacao(lista: ComAloc[]) {
  const acima = lista.filter((x) => situacaoPessoa(x.aloc, x.p) === 'acima').length;
  return [{ rotulo: 'Pessoas', valor: String(lista.length) }, { rotulo: 'Acima do cedido', valor: String(acima), tom: (acima ? 'crit' : 'ok') as Tom }];
}

// ---------- Financeiro (PMO e GP) ----------

const OPC_SIT_CUSTO = com('Todas as situações', [{ valor: 'crit', rotulo: 'Estouro de orçamento' }, { valor: 'aten', rotulo: 'Previsão acima do orçado' }, { valor: 'ok', rotulo: 'Dentro do orçamento' }]);
const ROT_CUSTO: Record<string, string> = { ok: 'Dentro', aten: 'Acima do orçado', crit: 'Estouro' };

function relatorioFinanceiro(d: DadosOrg, projetos: Iniciativa[], busca: Busca, comArea: boolean, filtrosExtra: Filtro[]): Relatorio {
  const fSit = filtro(busca, 'financeiro', 'situacao', 'Situação do custo', OPC_SIT_CUSTO);
  const linhas = projetos.map((i) => ({ i, f: financeiroDo(d, i) }))
    .filter((x) => fSit.valor === TODOS || x.f.situacao === fSit.valor)
    .sort((a, b) => b.f.desvioPct - a.f.desvioPct);
  const soma = (k: 'orcado' | 'realizado' | 'previsao') => linhas.reduce((s, x) => s + x.f[k], 0);
  const orcado = soma('orcado'), previsao = soma('previsao');
  return {
    id: 'financeiro', titulo: 'Financeiro dos projetos', descricao: 'Orçado, realizado e previsão de custo no fim de cada projeto em execução ou pausado, dos maiores desvios para os menores.',
    filtros: [...filtrosExtra, fSit],
    resumo: [
      { rotulo: 'Orçado', valor: dinheiro(orcado) },
      { rotulo: 'Realizado', valor: dinheiro(soma('realizado')) },
      { rotulo: 'Previsto no fim', valor: dinheiro(previsao), tom: previsao > orcado * 1.1 ? 'crit' : previsao > orcado ? 'aten' : 'ok' },
      { rotulo: 'Projetos estourando', valor: String(linhas.filter((x) => x.f.situacao === 'crit').length), tom: linhas.some((x) => x.f.situacao === 'crit') ? 'crit' : 'ok' },
    ],
    colunas: ['Projeto', ...(comArea ? ['Área'] : []), 'Orçado', 'Realizado', 'Consumo × concluído', 'Previsto no fim', 'Desvio', 'Situação'],
    linhas: linhas.map(({ i, f }): Celula[] => [
      i.titulo, ...(comArea ? [nomeArea(d, i.areaId)] : []), dinheiro(f.orcado), dinheiro(f.realizado), `${f.consumoPct}% × ${f.concluidoPct}%`, dinheiro(f.previsao),
      { texto: f.desvioPct > 0 ? `+${f.desvioPct}%` : `${f.desvioPct}%`, tom: f.situacao }, { texto: ROT_CUSTO[f.situacao], tom: f.situacao },
    ]),
    vazio: 'Nenhum projeto com esses filtros.',
  };
}

// ---------- Riscos (PMO e GP) ----------

const TOM_NIVEL: Record<string, Tom> = { Alto: 'crit', Médio: 'aten', Baixo: 'ok' };
function riscosDosProjetos(d: DadosOrg, projetos: Iniciativa[]) {
  const porFase = new Map(d.fases.map((f) => [f.id, f]));
  const ids = new Set(projetos.map((i) => i.id));
  return d.riscos.flatMap((r) => {
    const f = porFase.get(r.faseId);
    const ini = f && ids.has(f.iniciativaId) ? projetos.find((i) => i.id === f.iniciativaId) : undefined;
    return f && ini ? [{ r, f, ini }] : [];
  });
}

/** Matriz probabilidade × impacto com a quantidade de riscos ativos em cada célula. */
function relatorioMatriz(d: DadosOrg, projetos: Iniciativa[], filtros: Filtro[]): Relatorio {
  const ativos = riscosDosProjetos(d, projetos).filter((x) => riscoAtivo(x.r.status));
  const linhas = [3, 2, 1].map((imp): Celula[] => [
    `Impacto ${ESCALA_IMPACTO[imp].toLowerCase()}`,
    ...[1, 2, 3].map((prob): Celula => ({ texto: String(ativos.filter((x) => x.r.impacto === imp && x.r.probabilidade === prob).length), tom: TOM_NIVEL[nivelDoRisco(prob, imp)] })),
  ]);
  const altos = ativos.filter((x) => x.r.nivel === 'Alto').length;
  return {
    id: 'matriz', titulo: 'Matriz de riscos', descricao: 'Riscos em acompanhamento ou que já ocorreram, por probabilidade e impacto. A cor da célula é a zona de nível (vermelho = alto).',
    filtros, resumo: [{ rotulo: 'Riscos ativos', valor: String(ativos.length) }, { rotulo: 'Altos', valor: String(altos), tom: altos ? 'crit' : 'ok' },
      { rotulo: 'Sem plano de resposta', valor: String(ativos.filter((x) => !x.r.plano).length), tom: ativos.some((x) => !x.r.plano) ? 'aten' : 'ok' }],
    colunas: ['', 'Probabilidade baixa', 'Probabilidade média', 'Probabilidade alta'], linhas, vazio: '',
  };
}

/** Lista de riscos, do maior para o menor. */
function relatorioRiscos(d: DadosOrg, projetos: Iniciativa[], busca: Busca, titulo: string, filtrosExtra: Filtro[]): Relatorio {
  const fNivel = filtro(busca, 'riscos', 'nivel', 'Nível', com('Todos os níveis', [{ valor: 'Alto', rotulo: 'Alto' }, { valor: 'Médio', rotulo: 'Médio' }, { valor: 'Baixo', rotulo: 'Baixo' }]));
  const fStatus = filtro(busca, 'riscos', 'status', 'Status', [{ valor: 'ativos', rotulo: 'Ativos (em acompanhamento ou ocorreram)' }, { valor: TODOS, rotulo: 'Todos' }, ...Object.entries(STATUS_RISCO).map(([k, r]) => ({ valor: k, rotulo: r }))]);
  const fPlano = filtro(busca, 'riscos', 'plano', 'Plano de resposta', com('Com ou sem plano', [{ valor: 'sem', rotulo: 'Sem plano' }, { valor: 'com', rotulo: 'Com plano' }]));
  const lista = riscosDosProjetos(d, projetos)
    .filter(({ r }) => (fNivel.valor === TODOS || r.nivel === fNivel.valor)
      && (fStatus.valor === TODOS || (fStatus.valor === 'ativos' ? riscoAtivo(r.status) : r.status === fStatus.valor))
      && (fPlano.valor === TODOS || (fPlano.valor === 'sem') === !r.plano))
    .sort((a, b) => b.r.probabilidade * b.r.impacto - a.r.probabilidade * a.r.impacto);
  return {
    id: 'riscos', titulo, descricao: 'Riscos dos projetos em execução e pausados, do maior para o menor (probabilidade × impacto).',
    filtros: [...filtrosExtra, fNivel, fStatus, fPlano],
    resumo: [{ rotulo: 'Riscos', valor: String(lista.length) }, { rotulo: 'Sem responsável', valor: String(lista.filter((x) => !x.r.responsavelId).length), tom: lista.some((x) => !x.r.responsavelId) ? 'aten' : 'ok' }],
    colunas: ['Risco', 'Projeto', 'Fase', 'Nível', 'Probabilidade × impacto', 'Responsável', 'Plano de resposta', 'Status'],
    linhas: lista.map(({ r, f, ini }): Celula[] => [
      r.nome, nomeCurtoProjeto(ini.titulo), f.nome, { texto: r.nivel, tom: TOM_NIVEL[r.nivel] ?? 'neutro' },
      `${ESCALA[r.probabilidade]} × ${ESCALA_IMPACTO[r.impacto]}`, pessoa(d, r.responsavelId)?.nome ?? { texto: 'Sem responsável', tom: 'aten' },
      r.plano || { texto: 'Sem plano', tom: 'aten' }, STATUS_RISCO[r.status] ?? r.status,
    ]),
    vazio: 'Nenhum risco com esses filtros.',
  };
}

// ---------- Capacidade por área e mês ----------

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function relatorioCapacidadeMes(d: DadosOrg, hoje: string, busca: Busca, areasPermitidas?: Set<string>): Relatorio {
  const fArea = filtro(busca, 'capmes', 'area', 'Área', opcoesArea(d, areasPermitidas));
  const fHor = filtro(busca, 'capmes', 'horizonte', 'Horizonte', [{ valor: '6', rotulo: 'Próximos 6 meses' }, { valor: '3', rotulo: 'Próximos 3 meses' }, { valor: '12', rotulo: 'Próximos 12 meses' }]);
  const meses = proximosMeses(hoje, Number(fHor.valor));
  // uma linha por área com gente cedendo para projetos (só as pessoas da própria área, para não contar duas vezes)
  const linhas = d.areas
    .filter((a) => (!areasPermitidas || areasPermitidas.has(a.id)) && naArea(d, a.id, fArea))
    .map((a) => ({ a, c: capacidadeDaArea(d, a.id, meses, hoje, false) }))
    .filter((x) => x.c.cedido > 0 || x.c.meses.some((m) => m > 0));
  const estouradas = linhas.filter((x) => x.c.meses.some((m) => situacaoCapacidade(m, x.c.cedido) === 'crit')).length;
  return {
    id: 'capmes', titulo: 'Capacidade por área e mês', descricao: 'Pessoas-equivalentes alocadas em projetos × o que a área cede (100% = uma pessoa em tempo integral). Vermelho: acima do cedido; âmbar: acima de 85%.',
    filtros: [fArea, fHor],
    resumo: [{ rotulo: 'Áreas', valor: String(linhas.length) }, { rotulo: 'Acima do cedido em algum mês', valor: String(estouradas), tom: estouradas ? 'crit' : 'ok' }],
    colunas: ['Área', 'Pode ceder', ...meses.map((m) => `${MES_CURTO[Number(m.de.slice(5, 7)) - 1]} ${m.de.slice(2, 4)}`)],
    linhas: linhas.map(({ a, c }): Celula[] => [a.nome, `${pessoasEq(c.cedido)} (${c.pessoas} ${c.pessoas === 1 ? "pessoa" : "pessoas"})`, ...c.meses.map((m): Celula => ({ texto: pessoasEq(m), tom: m === 0 ? 'neutro' : situacaoCapacidade(m, c.cedido) }))]),
    vazio: 'Nenhuma área com capacidade cedida.',
  };
}

// ---------- PMO ----------

function relatoriosPmo(d: DadosOrg, hoje: string, busca: Busca): Relatorio[] {
  const ativas = d.iniciativas.filter((i) => i.solStatus !== 'rascunho');
  // áreas que têm iniciativas, mais as áreas-mãe delas (para poder filtrar por diretoria)
  const comIni = new Set(ativas.flatMap((i) => (i.areaId ? [i.areaId] : [])));
  const areasComIni = new Set(d.areas.filter((a) => subarvore(a.id, d.areas).some((x) => comIni.has(x))).map((a) => a.id));

  // 1. Portfólio por etapa · filtros: área e ciclo
  const fArea1 = filtro(busca, 'portfolio', 'area', 'Área', opcoesArea(d, areasComIni));
  const fCiclo1 = filtro(busca, 'portfolio', 'ciclo', 'Ciclo', opcoesCiclo(d));
  const doPortfolio = ativas.filter((i) => naArea(d, i.areaId, fArea1) && noCiclo(i, fCiclo1));
  const porEtapa = d.raias.slice().sort((a, b) => a.ordem - b.ordem).map((r) => {
    const doRaia = doPortfolio.filter((i) => i.raiaId === r.id && !(r.chave === 'sol' && !i.enviadaEm));
    return { r, n: doRaia.length, custo: doRaia.reduce((t, i) => t + custoDe(i), 0) };
  });
  const exe = doPortfolio.filter((i) => noRaia(d, i, 'exe'));

  // 2. Saúde dos projetos · filtros: área, farol e etapa
  const fArea2 = filtro(busca, 'saude', 'area', 'Área', opcoesArea(d, areasComIni));
  const fFarol2 = filtro(busca, 'saude', 'farol', 'Farol', OPC_FAROL);
  const fEtapa2 = filtro(busca, 'saude', 'etapa', 'Etapa', com('Em execução e pausados', [{ valor: 'exe', rotulo: 'Em execução' }, { valor: 'pau', rotulo: 'Pausados' }]));
  const etapas = fEtapa2.valor === TODOS ? ['exe', 'pau'] : [fEtapa2.valor];
  const projetos = filtraFarol(d.iniciativas.filter((i) => noRaia(d, i, ...etapas) && naArea(d, i.areaId, fArea2)), fFarol2);

  // 3. Ciclos · filtro: situação do ciclo
  const fSit3 = filtro(busca, 'ciclos', 'situacao', 'Situação', com('Todos os ciclos', [{ valor: 'andamento', rotulo: 'Em andamento' }, { valor: 'encerrado', rotulo: 'Encerrados' }]));
  const ciclos = d.ciclos
    .filter((c) => c.etapa !== 'planejado' && (fSit3.valor === TODOS || (fSit3.valor === 'encerrado') === (c.etapa === 'encerrado')))
    .sort((a, b) => b.ano - a.ano)
    .map((c): Celula[] => {
      const n: Snapshot = c.etapa !== 'encerrado' ? numerosAoVivo(d, c) : (c.snapshot ?? {}) as Snapshot;
      const comprometido = n.comprometido ?? n.realizado ?? 0;
      const pct = c.orcamentoRef ? Math.round((comprometido / c.orcamentoRef) * 100) : 0;
      const v = (x: number | undefined) => (x === undefined ? '—' : String(x));
      return [
        c.nome, rotuloEtapa(c), v(n.recebidas), v(n.preAprovadas), v(n.backlog), v(n.recusadas),
        { texto: `${dinheiro(comprometido)} de ${dinheiro(c.orcamentoRef)} (${pct}%)`, tom: pct > 100 ? 'crit' : 'neutro' },
      ];
    });

  // 4. Demanda por área · filtros: ciclo e tipo
  const fCiclo4 = filtro(busca, 'areas', 'ciclo', 'Ciclo', opcoesCiclo(d));
  const fTipo4 = filtro(busca, 'areas', 'tipo', 'Tipo', com('Todos os tipos', Object.entries(TIPOS).map(([k, t]) => ({ valor: k, rotulo: t.rotulo }))));
  // todas as iniciativas que não são rascunho (as mais antigas, que já viraram projeto, podem não ter data de envio)
  const daDemanda = ativas.filter((i) => noCiclo(i, fCiclo4) && (fTipo4.valor === TODOS || i.tipo === fTipo4.valor));
  const porArea = d.areas.filter((a) => daDemanda.some((i) => i.areaId === a.id)).map((a): Celula[] => {
    const da = daDemanda.filter((i) => i.areaId === a.id);
    const conta = (...ch: string[]) => da.filter((i) => ch.includes(chaveDaRaia(d, i.raiaId) ?? '')).length;
    return [a.nome, String(da.length), String(conta('sol', 'bkl')), String(conta('pre')), String(conta('exe', 'pau')), String(conta('con')), String(conta('can'))];
  }).sort((a, b) => Number(b[1]) - Number(a[1]));

  // 5. Capacidade · filtros: área e situação
  const fArea5 = filtro(busca, 'capacidade', 'area', 'Área', opcoesArea(d));
  const fSit5 = filtro(busca, 'capacidade', 'situacao', 'Situação', OPC_SITUACAO_PESSOA);
  const candidatas = d.pessoas.filter((p) => !p.externo && naArea(d, p.areaId, fArea5) && (alocacaoDe(d, p.id, hoje) > 0 || (p.cedeAte ?? 0) > 0));
  const pessoas = comAlocacao(d, candidatas, hoje, fSit5);

  return [
    {
      id: 'portfolio', titulo: 'Portfólio por etapa', descricao: 'Quantas iniciativas e projetos estão em cada etapa da esteira e o custo estimado somado.',
      filtros: [fArea1, fCiclo1],
      resumo: [
        { rotulo: 'No portfólio', valor: String(porEtapa.reduce((t, x) => t + x.n, 0)) },
        { rotulo: 'Em execução', valor: String(exe.length) },
        { rotulo: 'Custo em execução', valor: dinheiro(exe.reduce((t, i) => t + custoDe(i), 0)) },
      ],
      colunas: ['Etapa', 'Quantidade', 'Custo estimado'],
      linhas: porEtapa.map((x) => [x.r.nome, String(x.n), dinheiro(x.custo)]),
      vazio: 'Nenhuma iniciativa no portfólio.',
    },
    {
      id: 'saude', titulo: 'Saúde dos projetos', descricao: 'Projetos em execução e pausados, dos mais críticos para os que estão em dia.',
      filtros: [fArea2, fFarol2, fEtapa2],
      resumo: resumoFarol(projetos), colunas: COLUNAS_SAUDE(true), linhas: saudeProjetos(d, projetos, hoje, true), vazio: 'Nenhum projeto com esses filtros.',
    },
    (() => {
      const fArea = filtro(busca, 'financeiro', 'area', 'Área', opcoesArea(d, areasComIni));
      return relatorioFinanceiro(d, d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau') && naArea(d, i.areaId, fArea)), busca, true, [fArea]);
    })(),
    (() => {
      const fArea = filtro(busca, 'matriz', 'area', 'Área', opcoesArea(d, areasComIni));
      return relatorioMatriz(d, d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau') && naArea(d, i.areaId, fArea)), [fArea]);
    })(),
    (() => {
      const fArea = filtro(busca, 'riscos', 'area', 'Área', opcoesArea(d, areasComIni));
      return relatorioRiscos(d, d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau') && naArea(d, i.areaId, fArea)), busca, 'Riscos do portfólio', [fArea]);
    })(),
    {
      id: 'ciclos', titulo: 'Ciclos de planejamento', descricao: 'Resultado de cada ciclo. O ciclo em andamento é calculado ao vivo; os encerrados mostram a foto do fechamento.',
      filtros: [fSit3],
      resumo: [], colunas: ['Ciclo', 'Etapa', 'Recebidas', 'Pré-aprovadas', 'Backlog', 'Recusadas', 'Orçamento comprometido'],
      linhas: ciclos, vazio: 'Nenhum ciclo com esse filtro.',
    },
    {
      id: 'areas', titulo: 'Demanda por área', descricao: 'Iniciativas de cada área solicitante (sem contar rascunhos) e onde cada uma está hoje.',
      filtros: [fCiclo4, fTipo4],
      resumo: [{ rotulo: 'Iniciativas', valor: String(daDemanda.length) }, { rotulo: 'Áreas', valor: String(porArea.length) }],
      colunas: ['Área', 'Iniciativas', 'Em avaliação', 'Pré-projeto', 'Em projeto', 'Concluídas', 'Recusadas ou canceladas'],
      linhas: porArea, vazio: 'Nenhuma iniciativa com esses filtros.',
    },
    relatorioCapacidadeMes(d, hoje, busca),
    {
      id: 'capacidade', titulo: 'Capacidade das pessoas', descricao: 'Quanto cada pessoa pode ceder para projetos e quanto está alocada (pico nas fases que ainda vão acontecer).',
      filtros: [fArea5, fSit5],
      resumo: resumoAlocacao(pessoas), colunas: COLUNAS_ALOCACAO(true), linhas: alocacaoPessoas(d, pessoas, hoje, true), vazio: 'Ninguém com esses filtros.',
    },
  ];
}

// ---------- Gestor de área ----------

function relatoriosGestor(d: DadosOrg, eu: Pessoa, hoje: string, busca: Busca): Relatorio[] {
  const minhas = new Set(areasSobGestao(eu.id, d.areas));
  const opcSubarea = opcoesArea(d, minhas);
  const temSub = minhas.size > 1; // o filtro de área só aparece para quem cuida de mais de uma área
  const grupo = (i: Iniciativa) => {
    const c = chaveDaRaia(d, i.raiaId);
    if (c === 'sol' && i.solStatus === 'aguardando_gestor') return i.aprovadorId === eu.id ? 'voce' : 'outro';
    if (c === 'sol' && i.solStatus === 'devolvida') return 'devolvida';
    if ((c === 'sol' && i.solStatus === 'aguardando_pmo') || c === 'bkl') return 'pmo';
    if (['pre', 'exe', 'pau', 'con'].includes(c ?? '')) return 'aprovada';
    if (c === 'can') return 'nao';
    return 'outro';
  };

  // 1. Iniciativas · filtros: situação e área
  const fSit1 = filtro(busca, 'iniciativas', 'situacao', 'Situação', com('Todas as situações', [
    { valor: 'voce', rotulo: 'Aguardando você' }, { valor: 'devolvida', rotulo: 'Devolvidas para ajuste' }, { valor: 'pmo', rotulo: 'Com o PMO' },
    { valor: 'aprovada', rotulo: 'Aprovadas' }, { valor: 'nao', rotulo: 'Não aprovadas' },
  ]));
  const fArea1 = filtro(busca, 'iniciativas', 'area', 'Área', opcSubarea);
  const daArea = d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId) && i.solStatus !== 'rascunho' && naArea(d, i.areaId, fArea1));
  const lista1 = daArea.filter((i) => fSit1.valor === TODOS || grupo(i) === fSit1.valor);
  const n = (g: string) => lista1.filter((i) => grupo(i) === g).length;
  const iniciativas = lista1
    .sort((a, b) => (b.enviadaEm?.getTime() ?? 0) - (a.enviadaEm?.getTime() ?? 0))
    .map((i): Celula[] => [
      i.titulo, pessoa(d, i.solicitanteId)?.nome ?? '—', TIPOS[i.tipo]?.rotulo ?? '', dia(i.enviadaEm),
      grupo(i) === 'voce' ? { texto: 'Aguardando você', tom: 'aten' } : [nomeRaia(d, i), situacaoDoCard(d, i)].filter(Boolean).join(' · '),
    ]);

  // 2. Projetos · filtros: farol e área
  const fFarol2 = filtro(busca, 'projetos', 'farol', 'Farol', OPC_FAROL);
  const fArea2 = filtro(busca, 'projetos', 'area', 'Área', opcSubarea);
  const projetos = filtraFarol(d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId) && noRaia(d, i, 'exe', 'pau') && naArea(d, i.areaId, fArea2)), fFarol2);

  // 3. Time · filtro: situação
  const fSit3 = filtro(busca, 'time', 'situacao', 'Situação', OPC_SITUACAO_PESSOA);
  const time = comAlocacao(d, timeDireto(eu.id, d.pessoas, d.areas), hoje, fSit3);

  return [
    {
      id: 'iniciativas', titulo: 'Iniciativas da área', descricao: 'Iniciativas da sua área (sem contar rascunhos) e onde cada uma está hoje.',
      filtros: temSub ? [fSit1, fArea1] : [fSit1],
      resumo: [
        { rotulo: 'Iniciativas', valor: String(lista1.length) },
        { rotulo: 'Aguardando você', valor: String(n('voce')), tom: n('voce') ? 'aten' : 'ok' },
        { rotulo: 'Com o PMO', valor: String(n('pmo')) },
        { rotulo: 'Aprovadas', valor: String(n('aprovada')), tom: 'ok' },
        { rotulo: 'Não aprovadas', valor: String(n('nao')) },
      ],
      colunas: ['Iniciativa', 'Solicitante', 'Tipo', 'Enviada em', 'Situação'], linhas: iniciativas, vazio: 'Nenhuma iniciativa com esses filtros.',
    },
    {
      id: 'projetos', titulo: 'Projetos da área', descricao: 'Projetos da sua área em execução e pausados, dos mais críticos para os que estão em dia.',
      filtros: temSub ? [fFarol2, fArea2] : [fFarol2],
      resumo: resumoFarol(projetos), colunas: COLUNAS_SAUDE(false), linhas: saudeProjetos(d, projetos, hoje, false), vazio: 'Nenhum projeto com esses filtros.',
    },
    relatorioCapacidadeMes(d, hoje, busca, minhas),
    {
      id: 'time', titulo: 'Alocação do time', descricao: 'Quanto cada pessoa do seu time pode ceder para projetos e quanto está alocada.',
      filtros: [fSit3],
      resumo: resumoAlocacao(time), colunas: COLUNAS_ALOCACAO(false), linhas: alocacaoPessoas(d, time, hoje, false), vazio: 'Ninguém com esse filtro.',
    },
  ];
}

// ---------- Gerente de projeto ----------

function relatoriosGp(d: DadosOrg, eu: Pessoa, hoje: string, busca: Busca): Relatorio[] {
  const meus = d.iniciativas.filter((i) => i.gpId === eu.id && noRaia(d, i, 'exe', 'pau'));
  const opcProjeto = com('Todos os meus projetos', meus.map((i) => ({ valor: i.id, rotulo: nomeCurtoProjeto(i.titulo) })));
  const doProjeto = (f: Filtro) => (f.valor === TODOS ? meus : meus.filter((i) => i.id === f.valor));

  // 1. Meus projetos · filtro: farol
  const fFarol1 = filtro(busca, 'projetos', 'farol', 'Farol', OPC_FAROL);
  const lista1 = filtraFarol(meus, fFarol1);
  const projetos = lista1
    .map((i) => ({ i, info: infoProjeto(d, i, hoje) }))
    .sort((a, b) => (ORDEM_FAROL[a.i.farol ?? 'ok'] ?? 3) - (ORDEM_FAROL[b.i.farol ?? 'ok'] ?? 3))
    .map(({ i, info }): Celula[] => [
      i.titulo, nomeRaia(d, i), celFarol(i.farol), { texto: rotuloDesvioCurto(info.desvio), tom: tomDesvio(info.desvio) },
      `${info.progresso}%`, br(info.fimPrevisto),
      info.proximoMarco ? `${info.proximoMarco.nome}${info.proximoMarco.data ? ` · ${br(info.proximoMarco.data)}` : ''}` : '—',
      info.ultimoStatus ? br(info.ultimoStatus.data) : { texto: 'Sem status', tom: 'aten' },
    ]);

  // 2. Tarefas em aberto · filtros: projeto, situação e responsável
  const fProj2 = filtro(busca, 'tarefas', 'projeto', 'Projeto', opcProjeto);
  const fSit2 = filtro(busca, 'tarefas', 'situacao', 'Situação', com('Todas em aberto', [
    { valor: 'atrasada', rotulo: 'Atrasadas' }, { valor: 'prazo', rotulo: 'No prazo' }, { valor: 'semprazo', rotulo: 'Sem prazo' },
  ]));
  const sitTarefa = (prazo: string | null) => (!prazo ? 'semprazo' : prazo < hoje ? 'atrasada' : 'prazo');
  const abertasProj = doProjeto(fProj2).flatMap((i) => infoProjeto(d, i, hoje).tarefas.filter((t) => !t.concluida).map((t) => ({ i, t })));
  const responsaveis = [...new Set(abertasProj.map(({ t }) => t.responsavelId).filter(Boolean) as string[])]
    .map((id) => ({ valor: id, rotulo: pessoa(d, id)?.nome ?? '—' })).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  const fResp2 = filtro(busca, 'tarefas', 'responsavel', 'Responsável', com('Todos os responsáveis', responsaveis));
  const abertas = abertasProj
    .filter(({ t }) => (fSit2.valor === TODOS || sitTarefa(t.prazo) === fSit2.valor) && (fResp2.valor === TODOS || t.responsavelId === fResp2.valor))
    .sort((a, b) => (a.t.prazo ?? '9999').localeCompare(b.t.prazo ?? '9999'));
  const atrasadas = abertas.filter(({ t }) => sitTarefa(t.prazo) === 'atrasada').length;
  const tarefas = abertas.map(({ i, t }): Celula[] => {
    const st = sitTarefa(t.prazo);
    return [t.titulo, nomeCurtoProjeto(i.titulo), pessoa(d, t.responsavelId)?.nome ?? '—', t.prazo ? br(t.prazo) : '—',
      st === 'semprazo' ? { texto: 'Sem prazo', tom: 'neutro' } : st === 'atrasada' ? { texto: 'Atrasada', tom: 'crit' } : { texto: 'No prazo', tom: 'ok' }];
  });

  // 3. Equipe · filtros: projeto e situação
  const fProj3 = filtro(busca, 'equipe', 'projeto', 'Projeto', opcProjeto);
  const fSit3 = filtro(busca, 'equipe', 'situacao', 'Situação', OPC_SITUACAO_PESSOA);
  const faseIds = new Set(doProjeto(fProj3).flatMap((i) => infoProjeto(d, i, hoje).fases.map((f) => f.id)));
  const equipeIds = new Set(d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => a.pessoaId));
  const equipe = comAlocacao(d, d.pessoas.filter((p) => equipeIds.has(p.id)), hoje, fSit3);

  return [
    {
      id: 'projetos', titulo: 'Meus projetos', descricao: 'Andamento dos projetos que você gerencia.',
      filtros: [fFarol1], resumo: resumoFarol(lista1),
      colunas: ['Projeto', 'Etapa', 'Farol', 'Desvio', 'Concluído', 'Fim previsto', 'Próximo marco', 'Último status'], linhas: projetos,
      vazio: 'Nenhum projeto com esse filtro.',
    },
    relatorioFinanceiro(d, meus, busca, false, []),
    relatorioRiscos(d, meus, busca, 'Riscos dos meus projetos', []),
    {
      id: 'tarefas', titulo: 'Tarefas em aberto', descricao: 'Tarefas não concluídas dos seus projetos, pela ordem do prazo.',
      filtros: [fProj2, fSit2, fResp2],
      resumo: [{ rotulo: 'Tarefas', valor: String(abertas.length) }, { rotulo: 'Atrasadas', valor: String(atrasadas), tom: atrasadas ? 'crit' : 'ok' }],
      colunas: ['Tarefa', 'Projeto', 'Responsável', 'Prazo', 'Situação'], linhas: tarefas, vazio: 'Nenhuma tarefa com esses filtros.',
    },
    {
      id: 'equipe', titulo: 'Equipe dos meus projetos', descricao: 'Pessoas alocadas nos seus projetos e a alocação total delas (em todos os projetos).',
      filtros: [fProj3, fSit3],
      resumo: resumoAlocacao(equipe), colunas: COLUNAS_ALOCACAO(true), linhas: alocacaoPessoas(d, equipe, hoje, true), vazio: 'Ninguém com esses filtros.',
    },
  ];
}

// ---------- Colaborador ----------

function relatoriosColaborador(d: DadosOrg, eu: Pessoa, hoje: string, busca: Busca): Relatorio[] {
  const grupo = (i: Iniciativa) => {
    const c = chaveDaRaia(d, i.raiaId);
    if (i.solStatus === 'rascunho') return 'rascunho';
    if (c === 'sol' && i.solStatus === 'devolvida') return 'devolvida';
    if (c === 'sol' || c === 'bkl') return 'andamento';
    if (['pre', 'exe', 'pau', 'con'].includes(c ?? '')) return 'aprovada';
    return 'nao';
  };
  const todas = d.iniciativas.filter((i) => i.solicitanteId === eu.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // 1. Minhas iniciativas · filtro: situação
  const fSit1 = filtro(busca, 'iniciativas', 'situacao', 'Situação', com('Todas as situações', [
    { valor: 'andamento', rotulo: 'Em andamento' }, { valor: 'devolvida', rotulo: 'Devolvidas para ajuste' }, { valor: 'aprovada', rotulo: 'Aprovadas' },
    { valor: 'nao', rotulo: 'Não aprovadas' }, { valor: 'rascunho', rotulo: 'Rascunhos' },
  ]));
  const lista1 = todas.filter((i) => fSit1.valor === TODOS || grupo(i) === fSit1.valor);
  const n = (g: string) => lista1.filter((i) => grupo(i) === g).length;
  const iniciativas = lista1.map((i): Celula[] => {
    const g = grupo(i);
    return [i.titulo, g === 'rascunho' ? 'Rascunho' : dia(i.enviadaEm), rotuloCiclo(d, i),
      g === 'devolvida' ? { texto: 'Devolvida para ajuste', tom: 'aten' } : g === 'rascunho' ? 'Ainda não enviada' : [nomeRaia(d, i), situacaoDoCard(d, i)].filter(Boolean).join(' · ')];
  });

  // 2. Minhas tarefas · filtros: situação e projeto
  const projetosIds = new Set(d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau')).map((i) => i.id));
  const minhas = d.tarefas.filter((t) => t.responsavelId === eu.id && projetosIds.has(t.iniciativaId));
  const sitTarefa = (t: (typeof minhas)[number]) => (t.concluida ? 'concluida' : t.prazo && t.prazo < hoje ? 'atrasada' : 'aberta');
  const fSit2 = filtro(busca, 'tarefas', 'situacao', 'Situação', com('Todas', [
    { valor: 'aberta', rotulo: 'Em aberto, no prazo' }, { valor: 'atrasada', rotulo: 'Atrasadas' }, { valor: 'concluida', rotulo: 'Concluídas' },
  ]));
  const tituloProj = (id: string) => nomeCurtoProjeto(d.iniciativas.find((i) => i.id === id)?.titulo ?? '');
  const fProj2 = filtro(busca, 'tarefas', 'projeto', 'Projeto', com('Todos os projetos', [...new Set(minhas.map((t) => t.iniciativaId))].map((id) => ({ valor: id, rotulo: tituloProj(id) }))));
  const lista2 = minhas
    .filter((t) => (fSit2.valor === TODOS || sitTarefa(t) === fSit2.valor) && (fProj2.valor === TODOS || t.iniciativaId === fProj2.valor))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
  const atrasadas = lista2.filter((t) => sitTarefa(t) === 'atrasada').length;
  const tarefas = lista2.map((t): Celula[] => {
    const st = sitTarefa(t);
    return [t.titulo, tituloProj(t.iniciativaId), t.prazo ? br(t.prazo) : '—',
      st === 'concluida' ? { texto: 'Concluída', tom: 'ok' } : st === 'atrasada' ? { texto: 'Atrasada', tom: 'crit' } : !t.prazo ? { texto: 'Sem prazo', tom: 'neutro' } : { texto: 'No prazo', tom: 'neutro' }];
  });

  return [
    {
      id: 'iniciativas', titulo: 'Minhas iniciativas', descricao: 'Tudo o que você criou ou enviou e onde cada iniciativa está hoje.',
      filtros: [fSit1],
      resumo: [
        { rotulo: 'Iniciativas', valor: String(lista1.length) },
        { rotulo: 'Em andamento', valor: String(n('andamento') + n('devolvida')) },
        { rotulo: 'Aprovadas', valor: String(n('aprovada')), tom: 'ok' },
      ],
      colunas: ['Iniciativa', 'Enviada em', 'Ciclo', 'Situação'], linhas: iniciativas, vazio: 'Nenhuma iniciativa com esse filtro.',
    },
    {
      id: 'tarefas', titulo: 'Minhas tarefas', descricao: 'Suas tarefas nos projetos em andamento: primeiro as em aberto, pela ordem do prazo.',
      filtros: [fSit2, fProj2],
      resumo: [
        { rotulo: 'Tarefas', valor: String(lista2.length) },
        { rotulo: 'Atrasadas', valor: String(atrasadas), tom: atrasadas ? 'crit' : 'ok' },
        { rotulo: 'Concluídas', valor: String(lista2.filter((t) => t.concluida).length) },
      ],
      colunas: ['Tarefa', 'Projeto', 'Prazo', 'Situação'], linhas: tarefas, vazio: 'Nenhuma tarefa com esses filtros.',
    },
  ];
}

/** Relatórios do perfil ativo da sessão (no "ver como", os da pessoa escolhida), já com os filtros do endereço aplicados. */
export function relatoriosDoPerfil(d: DadosOrg, sessao: Sessao, hoje: string, busca: Busca = {}): Relatorio[] {
  switch (sessao.perfil) {
    case 'pmo': return relatoriosPmo(d, hoje, busca);
    case 'gestor': return relatoriosGestor(d, sessao.pessoa, hoje, busca);
    case 'gp': return relatoriosGp(d, sessao.pessoa, hoje, busca);
    default: return relatoriosColaborador(d, sessao.pessoa, hoje, busca);
  }
}
