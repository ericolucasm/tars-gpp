import type { DadosOrg, Iniciativa, Pessoa } from './dados';
import type { Sessao } from './sessao';
import { br, dinheiro } from './regras/datas';
import { acimaDoCedido, areasSobGestao, timeDireto } from './regras/pessoas';
import { rotuloDesvioCurto, FAROL, type Farol } from './regras/projeto';
import { numerosAoVivo, rotuloEtapa, type Snapshot } from './ciclo-vm';
import {
  alocacaoDe, chaveDaRaia, custoDe, infoProjeto, nomeArea, noRaia, pessoa, projetosDaPessoa, rotuloCiclo, situacaoDoCard, TIPOS,
} from './visoes';

// Relatórios de cada perfil. Tudo calculado a partir da mesma foto da empresa (carregarOrg),
// com as mesmas funções das outras telas, para os números baterem com a Início, o Portfólio e a Avaliação.

export type Tom = 'ok' | 'aten' | 'crit' | 'neutro';
export type Celula = string | { texto: string; tom: Tom };
export type Relatorio = {
  id: string;
  titulo: string;
  descricao: string;
  resumo: { rotulo: string; valor: string; tom?: Tom }[];
  colunas: string[];
  linhas: Celula[][];
  vazio: string;
};

const nomeCurtoProjeto = (t: string) => { const k = t.indexOf(' para '); return k > 0 ? t.slice(0, k) : t; };
const dia = (x: Date | null) => (x ? br(x.toISOString().slice(0, 10)) : '—');
const ORDEM_FAROL: Record<string, number> = { crit: 0, aten: 1, ok: 2 };

function celFarol(f: string | null): Celula {
  if (!f || !FAROL[f as Farol]) return '—';
  return { texto: FAROL[f as Farol].rotulo, tom: f as Tom };
}

function nomeRaia(d: DadosOrg, i: Iniciativa) {
  return d.raias.find((r) => r.id === i.raiaId)?.nome ?? '';
}

// ---------- Peças comuns ----------

/** Saúde de uma lista de projetos (PMO, gestor e GP veem o mesmo formato). */
function saudeProjetos(d: DadosOrg, projetos: Iniciativa[], hoje: string, comArea: boolean): Celula[][] {
  return projetos
    .map((i) => ({ i, info: infoProjeto(d, i, hoje) }))
    .sort((a, b) => (ORDEM_FAROL[a.i.farol ?? 'ok'] ?? 3) - (ORDEM_FAROL[b.i.farol ?? 'ok'] ?? 3) || a.i.titulo.localeCompare(b.i.titulo))
    .map(({ i, info }) => {
      const desvio = info.desvio;
      const tomDesvio: Tom = desvio === null ? 'neutro' : desvio > 2 ? 'crit' : desvio > 0 ? 'aten' : 'ok';
      return [
        i.titulo,
        ...(comArea ? [nomeArea(d, i.areaId)] : []),
        pessoa(d, i.gpId)?.nome ?? '—',
        nomeRaia(d, i),
        celFarol(i.farol),
        { texto: rotuloDesvioCurto(desvio), tom: tomDesvio },
        `${info.progresso}%`,
        br(info.fimPrevisto),
        info.ultimoStatus ? br(info.ultimoStatus.data) : { texto: 'Sem status', tom: 'aten' },
      ];
    });
}
const COLUNAS_SAUDE = (comArea: boolean) => ['Projeto', ...(comArea ? ['Área'] : []), 'GP', 'Etapa', 'Farol', 'Desvio', 'Concluído', 'Fim previsto', 'Último status'];

function resumoFarol(projetos: Iniciativa[]) {
  const n = (f: string) => projetos.filter((i) => i.farol === f).length;
  return [
    { rotulo: 'Projetos', valor: String(projetos.length) },
    { rotulo: 'OK', valor: String(n('ok')), tom: 'ok' as Tom },
    { rotulo: 'Atenção', valor: String(n('aten')), tom: 'aten' as Tom },
    { rotulo: 'Crítico', valor: String(n('crit')), tom: 'crit' as Tom },
  ];
}

/** Alocação de pessoas: quanto podem ceder, quanto estão alocadas e em quais projetos. */
function alocacaoPessoas(d: DadosOrg, pessoas: Pessoa[], hoje: string, comArea: boolean): Celula[][] {
  return pessoas
    .map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje), projs: projetosDaPessoa(d, p.id, hoje) }))
    .sort((a, b) => Number(acimaDoCedido(b.aloc, b.p.cedeAte, b.p.externo)) - Number(acimaDoCedido(a.aloc, a.p.cedeAte, a.p.externo)) || b.aloc - a.aloc || a.p.nome.localeCompare(b.p.nome))
    .map(({ p, aloc, projs }) => {
      const acima = acimaDoCedido(aloc, p.cedeAte, p.externo);
      return [
        p.nome,
        ...(comArea ? [nomeArea(d, p.areaId)] : []),
        p.externo ? 'Sem limite' : `${p.cedeAte ?? 0}%`,
        `${aloc}%`,
        acima ? { texto: 'Acima do cedido', tom: 'crit' } : aloc > 0 ? { texto: 'Dentro do limite', tom: 'ok' } : { texto: 'Sem projetos', tom: 'neutro' },
        projs.length ? projs.map((x) => `${nomeCurtoProjeto(x.projeto.titulo)} (${x.pct}%)`).join(', ') : '—',
      ];
    });
}
const COLUNAS_ALOCACAO = (comArea: boolean) => ['Pessoa', ...(comArea ? ['Área'] : []), 'Pode ceder', 'Alocação', 'Situação', 'Projetos'];

// ---------- PMO ----------

function relatoriosPmo(d: DadosOrg, hoje: string): Relatorio[] {
  const ativas = d.iniciativas.filter((i) => i.solStatus !== 'rascunho');

  // 1. Portfólio por etapa
  const porEtapa = d.raias.slice().sort((a, b) => a.ordem - b.ordem).map((r) => {
    const doRaia = ativas.filter((i) => i.raiaId === r.id && !(r.chave === 'sol' && !i.enviadaEm));
    return { r, n: doRaia.length, custo: doRaia.reduce((t, i) => t + custoDe(i), 0) };
  });
  const exe = d.iniciativas.filter((i) => noRaia(d, i, 'exe'));
  const custoExe = exe.reduce((t, i) => t + custoDe(i), 0);

  // 2. Saúde dos projetos
  const projetos = d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau'));

  // 3. Ciclos
  const ciclos = d.ciclos.filter((c) => c.etapa !== 'planejado').sort((a, b) => b.ano - a.ano).map((c): Celula[] => {
    const vivo = c.etapa !== 'encerrado';
    const n: Snapshot = vivo ? numerosAoVivo(d, c) : (c.snapshot ?? {}) as Snapshot;
    const comprometido = n.comprometido ?? n.realizado ?? 0;
    const pct = c.orcamentoRef ? Math.round((comprometido / c.orcamentoRef) * 100) : 0;
    const v = (x: number | undefined) => (x === undefined ? '—' : String(x));
    return [
      c.nome, rotuloEtapa(c), v(n.recebidas), v(n.preAprovadas), v(n.backlog), v(n.recusadas),
      { texto: `${dinheiro(comprometido)} de ${dinheiro(c.orcamentoRef)} (${pct}%)`, tom: pct > 100 ? 'crit' : 'neutro' },
    ];
  });

  // 4. Demanda por área
  // todas as iniciativas que não são rascunho (as mais antigas, que já viraram projeto, podem não ter data de envio)
  const areasComDemanda = d.areas.filter((a) => ativas.some((i) => i.areaId === a.id));
  const porArea = areasComDemanda.map((a): Celula[] => {
    const da = ativas.filter((i) => i.areaId === a.id);
    const conta = (...ch: string[]) => da.filter((i) => ch.includes(chaveDaRaia(d, i.raiaId) ?? '')).length;
    return [a.nome, String(da.length), String(conta('sol', 'bkl')), String(conta('pre')), String(conta('exe', 'pau')), String(conta('con')), String(conta('can'))];
  }).sort((a, b) => Number(b[1]) - Number(a[1]));

  // 5. Capacidade
  const pessoas = d.pessoas.filter((p) => !p.externo && (alocacaoDe(d, p.id, hoje) > 0 || (p.cedeAte ?? 0) > 0));
  const acima = pessoas.filter((p) => acimaDoCedido(alocacaoDe(d, p.id, hoje), p.cedeAte, p.externo)).length;

  return [
    {
      id: 'portfolio', titulo: 'Portfólio por etapa', descricao: 'Quantas iniciativas e projetos estão em cada etapa da esteira e o custo estimado somado.',
      resumo: [
        { rotulo: 'No portfólio', valor: String(porEtapa.reduce((t, x) => t + x.n, 0)) },
        { rotulo: 'Em execução', valor: String(exe.length) },
        { rotulo: 'Custo em execução', valor: dinheiro(custoExe) },
      ],
      colunas: ['Etapa', 'Quantidade', 'Custo estimado'],
      linhas: porEtapa.map((x) => [x.r.nome, String(x.n), dinheiro(x.custo)]),
      vazio: 'Nenhuma iniciativa no portfólio.',
    },
    {
      id: 'saude', titulo: 'Saúde dos projetos', descricao: 'Projetos em execução e pausados, dos mais críticos para os que estão em dia.',
      resumo: resumoFarol(projetos), colunas: COLUNAS_SAUDE(true), linhas: saudeProjetos(d, projetos, hoje, true), vazio: 'Nenhum projeto em execução ou pausado.',
    },
    {
      id: 'ciclos', titulo: 'Ciclos de planejamento', descricao: 'Resultado de cada ciclo. O ciclo em andamento é calculado ao vivo; os encerrados mostram a foto do fechamento.',
      resumo: [], colunas: ['Ciclo', 'Etapa', 'Recebidas', 'Pré-aprovadas', 'Backlog', 'Recusadas', 'Orçamento comprometido'],
      linhas: ciclos, vazio: 'Nenhum ciclo aberto ou encerrado ainda.',
    },
    {
      id: 'areas', titulo: 'Demanda por área', descricao: 'Iniciativas de cada área solicitante (sem contar rascunhos) e onde cada uma está hoje.',
      resumo: [], colunas: ['Área', 'Iniciativas', 'Em avaliação', 'Pré-projeto', 'Em projeto', 'Concluídas', 'Recusadas ou canceladas'],
      linhas: porArea, vazio: 'Nenhuma iniciativa no portfólio ainda.',
    },
    {
      id: 'capacidade', titulo: 'Capacidade das pessoas', descricao: 'Quanto cada pessoa pode ceder para projetos e quanto está alocada (pico nas fases que ainda vão acontecer).',
      resumo: [{ rotulo: 'Pessoas em projetos ou com cedência', valor: String(pessoas.length) }, { rotulo: 'Acima do cedido', valor: String(acima), tom: acima ? 'crit' : 'ok' }],
      colunas: COLUNAS_ALOCACAO(true), linhas: alocacaoPessoas(d, pessoas, hoje, true), vazio: 'Ninguém alocado em projetos.',
    },
  ];
}

// ---------- Gestor de área ----------

function relatoriosGestor(d: DadosOrg, eu: Pessoa, hoje: string): Relatorio[] {
  const minhas = new Set(areasSobGestao(eu.id, d.areas));
  const daArea = d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId) && i.solStatus !== 'rascunho');
  const situ = (i: Iniciativa) => chaveDaRaia(d, i.raiaId);
  const aguardandoMim = daArea.filter((i) => situ(i) === 'sol' && i.solStatus === 'aguardando_gestor' && i.aprovadorId === eu.id).length;
  const comPmo = daArea.filter((i) => (situ(i) === 'sol' && i.solStatus === 'aguardando_pmo') || situ(i) === 'bkl').length;
  const aprovadas = daArea.filter((i) => ['pre', 'exe', 'pau', 'con'].includes(situ(i) ?? '')).length;
  const naoAprovadas = daArea.filter((i) => situ(i) === 'can').length;
  const iniciativas = daArea
    .sort((a, b) => (b.enviadaEm?.getTime() ?? 0) - (a.enviadaEm?.getTime() ?? 0))
    .map((i): Celula[] => {
      const aguardando = situ(i) === 'sol' && i.solStatus === 'aguardando_gestor' && i.aprovadorId === eu.id;
      return [i.titulo, pessoa(d, i.solicitanteId)?.nome ?? '—', TIPOS[i.tipo]?.rotulo ?? '', dia(i.enviadaEm),
        aguardando ? { texto: 'Aguardando você', tom: 'aten' } : [nomeRaia(d, i), situacaoDoCard(d, i)].filter(Boolean).join(' · ')];
    });

  const projetos = d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId) && noRaia(d, i, 'exe', 'pau'));
  const time = timeDireto(eu.id, d.pessoas, d.areas);
  const acima = time.filter((p) => acimaDoCedido(alocacaoDe(d, p.id, hoje), p.cedeAte, p.externo)).length;

  return [
    {
      id: 'iniciativas', titulo: 'Iniciativas da área', descricao: 'Iniciativas da sua área (sem contar rascunhos) e onde cada uma está hoje.',
      resumo: [
        { rotulo: 'Iniciativas', valor: String(daArea.length) },
        { rotulo: 'Aguardando você', valor: String(aguardandoMim), tom: aguardandoMim ? 'aten' : 'ok' },
        { rotulo: 'Com o PMO', valor: String(comPmo) },
        { rotulo: 'Aprovadas', valor: String(aprovadas), tom: 'ok' },
        { rotulo: 'Não aprovadas', valor: String(naoAprovadas) },
      ],
      colunas: ['Iniciativa', 'Solicitante', 'Tipo', 'Enviada em', 'Situação'], linhas: iniciativas, vazio: 'Sua área ainda não enviou iniciativas.',
    },
    {
      id: 'projetos', titulo: 'Projetos da área', descricao: 'Projetos da sua área em execução e pausados, dos mais críticos para os que estão em dia.',
      resumo: resumoFarol(projetos), colunas: COLUNAS_SAUDE(false), linhas: saudeProjetos(d, projetos, hoje, false), vazio: 'Nenhum projeto da área em execução ou pausado.',
    },
    {
      id: 'time', titulo: 'Alocação do time', descricao: 'Quanto cada pessoa do seu time pode ceder para projetos e quanto está alocada.',
      resumo: [{ rotulo: 'Pessoas no time', valor: String(time.length) }, { rotulo: 'Acima do cedido', valor: String(acima), tom: acima ? 'crit' : 'ok' }],
      colunas: COLUNAS_ALOCACAO(false), linhas: alocacaoPessoas(d, time, hoje, false), vazio: 'Ninguém no seu time ainda.',
    },
  ];
}

// ---------- Gerente de projeto ----------

function relatoriosGp(d: DadosOrg, eu: Pessoa, hoje: string): Relatorio[] {
  const meus = d.iniciativas.filter((i) => i.gpId === eu.id && noRaia(d, i, 'exe', 'pau'));
  const infos = meus.map((i) => ({ i, info: infoProjeto(d, i, hoje) }));

  const projetos = infos
    .sort((a, b) => (ORDEM_FAROL[a.i.farol ?? 'ok'] ?? 3) - (ORDEM_FAROL[b.i.farol ?? 'ok'] ?? 3))
    .map(({ i, info }): Celula[] => [
      i.titulo, nomeRaia(d, i), celFarol(i.farol),
      { texto: rotuloDesvioCurto(info.desvio), tom: info.desvio === null ? 'neutro' : info.desvio > 2 ? 'crit' : info.desvio > 0 ? 'aten' : 'ok' },
      `${info.progresso}%`, br(info.fimPrevisto),
      info.proximoMarco ? `${info.proximoMarco.nome}${info.proximoMarco.data ? ` · ${br(info.proximoMarco.data)}` : ''}` : '—',
      info.ultimoStatus ? br(info.ultimoStatus.data) : { texto: 'Sem status', tom: 'aten' },
    ]);

  const abertas = infos.flatMap(({ i, info }) => info.tarefas.filter((t) => !t.concluida).map((t) => ({ i, t })))
    .sort((a, b) => (a.t.prazo ?? '9999').localeCompare(b.t.prazo ?? '9999'));
  const atrasadas = abertas.filter(({ t }) => t.prazo && t.prazo < hoje).length;
  const tarefas = abertas.map(({ i, t }): Celula[] => [
    t.titulo, nomeCurtoProjeto(i.titulo), pessoa(d, t.responsavelId)?.nome ?? '—', t.prazo ? br(t.prazo) : '—',
    !t.prazo ? { texto: 'Sem prazo', tom: 'neutro' } : t.prazo < hoje ? { texto: 'Atrasada', tom: 'crit' } : { texto: 'No prazo', tom: 'ok' },
  ]);

  const faseIds = new Set(infos.flatMap(({ info }) => info.fases.map((f) => f.id)));
  const equipeIds = new Set(d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => a.pessoaId));
  const equipe = d.pessoas.filter((p) => equipeIds.has(p.id));
  const acima = equipe.filter((p) => acimaDoCedido(alocacaoDe(d, p.id, hoje), p.cedeAte, p.externo)).length;

  return [
    {
      id: 'projetos', titulo: 'Meus projetos', descricao: 'Andamento dos projetos que você gerencia.',
      resumo: resumoFarol(meus),
      colunas: ['Projeto', 'Etapa', 'Farol', 'Desvio', 'Concluído', 'Fim previsto', 'Próximo marco', 'Último status'], linhas: projetos,
      vazio: 'Você não gerencia projetos em execução ou pausados.',
    },
    {
      id: 'tarefas', titulo: 'Tarefas em aberto', descricao: 'Tarefas não concluídas dos seus projetos, pela ordem do prazo.',
      resumo: [{ rotulo: 'Em aberto', valor: String(abertas.length) }, { rotulo: 'Atrasadas', valor: String(atrasadas), tom: atrasadas ? 'crit' : 'ok' }],
      colunas: ['Tarefa', 'Projeto', 'Responsável', 'Prazo', 'Situação'], linhas: tarefas, vazio: 'Nenhuma tarefa em aberto.',
    },
    {
      id: 'equipe', titulo: 'Equipe dos meus projetos', descricao: 'Pessoas alocadas nos seus projetos e a alocação total delas (em todos os projetos).',
      resumo: [{ rotulo: 'Pessoas', valor: String(equipe.length) }, { rotulo: 'Acima do cedido', valor: String(acima), tom: acima ? 'crit' : 'ok' }],
      colunas: COLUNAS_ALOCACAO(true), linhas: alocacaoPessoas(d, equipe, hoje, true), vazio: 'Ninguém alocado nos seus projetos.',
    },
  ];
}

// ---------- Colaborador ----------

function relatoriosColaborador(d: DadosOrg, eu: Pessoa, hoje: string): Relatorio[] {
  const minhas = d.iniciativas.filter((i) => i.solicitanteId === eu.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const c = (i: Iniciativa) => chaveDaRaia(d, i.raiaId);
  const emAndamento = minhas.filter((i) => ['sol', 'bkl'].includes(c(i) ?? '') && i.solStatus !== 'rascunho').length;
  const aprovadas = minhas.filter((i) => ['pre', 'exe', 'pau', 'con'].includes(c(i) ?? '')).length;
  const iniciativas = minhas.map((i): Celula[] => {
    const rasc = i.solStatus === 'rascunho';
    const devolvida = c(i) === 'sol' && i.solStatus === 'devolvida';
    return [i.titulo, rasc ? 'Rascunho' : dia(i.enviadaEm), rotuloCiclo(d, i),
      devolvida ? { texto: 'Devolvida para ajuste', tom: 'aten' } : rasc ? 'Ainda não enviada' : [nomeRaia(d, i), situacaoDoCard(d, i)].filter(Boolean).join(' · ')];
  });

  const projetosIds = new Set(d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau')).map((i) => i.id));
  const minhasTarefas = d.tarefas.filter((t) => t.responsavelId === eu.id && projetosIds.has(t.iniciativaId))
    .sort((a, b) => Number(a.concluida) - Number(b.concluida) || (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
  const atrasadas = minhasTarefas.filter((t) => !t.concluida && t.prazo && t.prazo < hoje).length;
  const tarefas = minhasTarefas.map((t): Celula[] => [
    t.titulo, nomeCurtoProjeto(d.iniciativas.find((i) => i.id === t.iniciativaId)?.titulo ?? ''), t.prazo ? br(t.prazo) : '—',
    t.concluida ? { texto: 'Concluída', tom: 'ok' } : !t.prazo ? { texto: 'Sem prazo', tom: 'neutro' } : t.prazo < hoje ? { texto: 'Atrasada', tom: 'crit' } : { texto: 'No prazo', tom: 'neutro' },
  ]);

  return [
    {
      id: 'iniciativas', titulo: 'Minhas iniciativas', descricao: 'Tudo o que você criou ou enviou e onde cada iniciativa está hoje.',
      resumo: [
        { rotulo: 'Criadas', valor: String(minhas.length) },
        { rotulo: 'Em andamento', valor: String(emAndamento) },
        { rotulo: 'Aprovadas', valor: String(aprovadas), tom: 'ok' },
      ],
      colunas: ['Iniciativa', 'Enviada em', 'Ciclo', 'Situação'], linhas: iniciativas, vazio: 'Você ainda não criou iniciativas.',
    },
    {
      id: 'tarefas', titulo: 'Minhas tarefas', descricao: 'Tarefas suas nos projetos em andamento: primeiro as em aberto, pela ordem do prazo.',
      resumo: [
        { rotulo: 'Em aberto', valor: String(minhasTarefas.filter((t) => !t.concluida).length) },
        { rotulo: 'Atrasadas', valor: String(atrasadas), tom: atrasadas ? 'crit' : 'ok' },
        { rotulo: 'Concluídas', valor: String(minhasTarefas.filter((t) => t.concluida).length) },
      ],
      colunas: ['Tarefa', 'Projeto', 'Prazo', 'Situação'], linhas: tarefas, vazio: 'Você não tem tarefas em projetos em andamento.',
    },
  ];
}

/** Relatórios do perfil ativo da sessão (no "ver como", os da pessoa escolhida). */
export function relatoriosDoPerfil(d: DadosOrg, sessao: Sessao, hoje: string): Relatorio[] {
  switch (sessao.perfil) {
    case 'pmo': return relatoriosPmo(d, hoje);
    case 'gestor': return relatoriosGestor(d, sessao.pessoa, hoje);
    case 'gp': return relatoriosGp(d, sessao.pessoa, hoje);
    default: return relatoriosColaborador(d, sessao.pessoa, hoje);
  }
}
