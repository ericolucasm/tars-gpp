import type { Ciclo, DadosOrg } from './dados';
import { br, diffDias, dinheiro } from './regras/datas';
import { chaveDaRaia, custoDe, listaAvaliacao, noRaia, pessoa, nomeArea } from './visoes';
import { subarvore } from './regras/pessoas';

// Números de um ciclo: ao vivo para o ciclo em andamento, foto congelada para os encerrados.

export const ETAPAS_CICLO = ['Inscrições', 'Gestores', 'Avaliação', 'Comunicação', 'Play'];
export const ETAPAS_CICLO_LONGAS = ['Inscrições', 'Aprovação dos gestores', 'Avaliação do PMO', 'Comunicação', 'Play dos projetos'];

export function indiceEtapa(c: Ciclo) {
  return ({ planejado: -1, inscricoes: 0, avaliacao: 2, comunicado: 4, encerrado: 5 } as Record<string, number>)[c.etapa] ?? 0;
}

export function rotuloEtapa(c: Ciclo) {
  return ({ planejado: 'Planejado', inscricoes: 'Inscrições abertas', avaliacao: 'Em avaliação', comunicado: 'Decisões comunicadas', encerrado: 'Encerrado' } as Record<string, string>)[c.etapa];
}

export type Snapshot = {
  recebidas?: number; preAprovadas?: number; viraramProjeto?: number; backlog?: number; recusadas?: number; comprometido?: number;
  motivosRecusa?: [string, number][]; concluidos?: number; cancelados?: number; realizado?: number; entreguesNoPrazo?: string; desvioMedio?: string;
};

/** Números ao vivo de um ciclo (também usados para gerar a foto no encerramento). */
export function numerosAoVivo(d: DadosOrg, c: Ciclo) {
  const doCiclo = d.iniciativas.filter((i) => i.cicloId === c.id && i.solStatus !== 'rascunho' && i.enviadaEm);
  const avs = d.avaliacoes.filter((a) => a.cicloId === c.id);
  const preAprov = avs.filter((a) => a.decisao === 'pre');
  const comprometido = preAprov.reduce((s, a) => {
    const ini = d.iniciativas.find((i) => i.id === a.iniciativaId);
    return s + (ini ? custoDe(ini) : 0);
  }, 0);
  const motivos = new Map<string, number>();
  for (const a of avs) if (a.decisao === 'rec' && a.motivoRecusa) motivos.set(a.motivoRecusa, (motivos.get(a.motivoRecusa) ?? 0) + 1);
  return {
    recebidas: doCiclo.length,
    aguardandoGestor: doCiclo.filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor').length,
    preAprovadas: preAprov.length,
    viraramProjeto: doCiclo.filter((i) => noRaia(d, i, 'exe', 'pau', 'con')).length,
    backlog: avs.filter((a) => a.decisao === 'bkl').length,
    recusadas: avs.filter((a) => a.decisao === 'rec').length,
    comprometido,
    motivosRecusa: [...motivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}

export type CicloVM = {
  id: string; nome: string; ano: number; atual: boolean;
  headline: string; status: string; on: boolean; janela: string; etapa: number;
  numeros: { rotulo: string; valor: string }[];
  orcamentoPct: number; orcamento: string;
  blocos: { titulo: string; linhas: { k: string; v: string }[] }[];
  link: string; cta: string;
};

export function cicloVM(d: DadosOrg, c: Ciclo, hoje: string): CicloVM {
  const ativo = ['inscricoes', 'avaliacao', 'comunicado'].includes(c.etapa);
  const curta = (iso: string) => br(iso).slice(0, 5);
  const base = { id: c.id, nome: c.nome, ano: c.ano, atual: ativo, etapa: indiceEtapa(c) };

  if (ativo || c.etapa === 'planejado') {
    const n = numerosAoVivo(d, c);
    const { itens } = listaAvaliacao(d);
    const prontas = itens.filter((x) => !x.comunicado && x.ini.solStatus === 'aguardando_pmo').length;
    const fora = d.iniciativas.filter((i) => !i.cicloId && i.enviadaEm && i.enviadaEm.toISOString().slice(0, 10) >= c.abertura && !noRaia(d, i, 'can')).length;
    const faltam = Math.max(0, diffDias(c.fechamento, hoje));
    const headline = c.etapa === 'inscricoes' ? `Inscrições abertas · faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`
      : c.etapa === 'avaliacao' ? 'Inscrições encerradas · em avaliação'
      : c.etapa === 'comunicado' ? 'Decisões comunicadas · preparando o play' : 'Ciclo planejado';
    const pct = c.orcamentoRef ? Math.round((n.comprometido / c.orcamentoRef) * 100) : 0;
    // Áreas que enviaram: gerências (exceto o PMO) com alguma iniciativa no ciclo, incluindo subáreas
    const gerencias = d.areas.filter((a) => a.tipo === 'Gerência' && a.nome !== 'PMO');
    const enviaram = gerencias.filter((g) => {
      const sub = new Set(subarvore(g.id, d.areas));
      return d.iniciativas.some((i) => i.cicloId === c.id && i.enviadaEm && i.areaId && sub.has(i.areaId));
    });
    const sem = gerencias.filter((g) => !enviaram.includes(g)).map((g) => g.nome);
    const paradas = new Map<string, number>();
    for (const i of d.iniciativas) if (noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && i.aprovadorId) paradas.set(i.aprovadorId, (paradas.get(i.aprovadorId) ?? 0) + 1);
    const blocos = [{ titulo: 'Áreas', linhas: [{ k: 'Enviaram', v: `${enviaram.length} de ${gerencias.length}` }, ...(sem.length ? [{ k: 'Sem envio', v: sem.slice(0, 3).join(', ') + (sem.length > 3 ? ` +${sem.length - 3}` : '') }] : [])] }];
    if (paradas.size) {
      blocos.push({ titulo: 'Aprovações paradas nos gestores', linhas: [...paradas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, qtd]) => {
        const p = pessoa(d, id);
        return { k: `${p?.nome ?? '—'} · ${nomeArea(d, p?.areaId)}`, v: String(qtd) };
      }) });
    }
    return {
      ...base, headline, status: c.etapa === 'planejado' ? 'Planejado' : 'Em andamento', on: true,
      janela: `Inscrições ${curta(c.abertura)} a ${br(c.fechamento)} · avaliação até ${curta(c.avaliacaoAte)} · decisões até ${curta(c.comunicarAte)}`,
      numeros: [
        { rotulo: 'Recebidas', valor: String(n.recebidas) }, { rotulo: 'Aguardando gestor', valor: String(n.aguardandoGestor) },
        { rotulo: 'Prontas para avaliar', valor: String(prontas) }, { rotulo: 'Fora do ciclo', valor: String(fora) },
      ],
      orcamentoPct: Math.min(100, pct),
      orcamento: n.comprometido ? `${dinheiro(n.comprometido)} pré-aprovados de ${dinheiro(c.orcamentoRef)} (${pct}%)` : `Referência de ${dinheiro(c.orcamentoRef)} · pré-aprovações começam após o fechamento`,
      blocos, link: '/ciclos', cta: 'Abrir ciclo',
    };
  }

  // Encerrado: foto do fechamento + situação de hoje dos projetos do ciclo
  const f = (c.snapshot ?? {}) as Snapshot;
  const projetos = d.iniciativas.filter((i) => i.cicloId === c.id && i.gpId);
  const exe = projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'exe');
  const blocos: CicloVM['blocos'] = [];
  if (projetos.length) {
    blocos.push({ titulo: 'Projetos do ciclo hoje', linhas: [
      { k: 'Em execução', v: String(exe.length) },
      { k: 'Concluídos', v: String(projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'con').length) },
      { k: 'Críticos', v: String(exe.filter((i) => i.farol === 'crit').length) },
    ] });
  }
  if (f.motivosRecusa?.length) blocos.push({ titulo: 'Principais motivos de recusa', linhas: f.motivosRecusa.slice(0, 2).map(([k, v]) => ({ k, v: String(v) })) });
  if (f.entreguesNoPrazo || f.desvioMedio) blocos.push({ titulo: 'Resultado', linhas: [
    ...(f.entreguesNoPrazo ? [{ k: 'Entregues no prazo', v: f.entreguesNoPrazo }] : []),
    ...(f.desvioMedio ? [{ k: 'Desvio médio', v: f.desvioMedio }] : []),
  ] });
  const numeros = f.backlog !== undefined
    ? [['Recebidas', f.recebidas], ['Viraram projeto', f.viraramProjeto], ['Backlog', f.backlog], ['Recusadas', f.recusadas]]
    : [['Recebidas', f.recebidas], ['Viraram projeto', f.viraramProjeto], ['Concluídos', f.concluidos], ['Cancelados', f.cancelados]];
  const gasto = f.comprometido ?? f.realizado ?? 0;
  const pct = c.orcamentoRef ? Math.round((gasto / c.orcamentoRef) * 100) : 0;
  return {
    ...base, headline: exe.length ? 'Ciclo encerrado · projetos em execução' : 'Ciclo encerrado', status: 'Encerrado', on: false,
    janela: c.comunicadoEm ? `Decisões comunicadas em ${br(c.comunicadoEm)}` : 'Ciclo encerrado',
    numeros: numeros.map(([r, v]) => ({ rotulo: r as string, valor: v === undefined ? '—' : String(v) })),
    orcamentoPct: Math.min(100, pct),
    orcamento: `${dinheiro(gasto)} ${f.comprometido !== undefined ? 'comprometidos' : 'realizados'} de ${dinheiro(c.orcamentoRef)} (${pct}%)`,
    blocos, link: exe.length ? '/portfolio' : '/ciclos', cta: exe.length ? 'Ver projetos no portfólio' : 'Abrir ciclo',
  };
}
