import type { DadosOrg, Pessoa } from './dados';
import { addDias, br, diffDias } from './regras/datas';
import { areasSobGestao, gestorDe, primeiroNome, timeDireto } from './regras/pessoas';
import { pontoAtrasado, pontoEsperaPor } from './regras/pontos';
import { riscoAtivo } from './regras/riscos';
import { prazoDecisao } from './regras/gestor';
import { rotuloVencimentoStatus, situacaoStatus, venceTextoCurto } from './regras/muro';
import { prontoParaConcluir } from './regras/esteira';
import { ordenarCaixa, type GrupoCaixa, type Prioridade } from './regras/meu-tars';
import { beneficiosParaMedir } from './beneficios-vm';
import { atrasos, entregas } from './muro';
import {
  alocacaoDe, chaveDaRaia, conclusaoPara, conflitosDeAusencia, dependenciasVM, equipeParaFeedback, financeiroDo, infoProjeto,
  listaAvaliacao, nomeArea, noRaia, pessoa, pessoasAcimaDoCedido, raiaChave, representados,
} from './visoes';

// Meu TARS: tudo que depende da pessoa, de todos os perfis dela, numa lista só (a "caixa única"), em ordem de prioridade.

export type TomCaixa = 'roxo' | 'vermelho' | 'ambar' | 'neutro';
export type Papel = 'Você' | 'Gestor' | 'GP' | 'PMO' | 'Patrocinador';
export type ItemCaixa = Prioridade & {
  id: string; titulo: string; sub: string; href: string; acao: string;
  tom?: TomCaixa; badgeTom?: TomCaixa; numero?: number; papel: Papel;
  cobrarIds?: string[]; // PMO: status atrasados, com o botão "Cobrar"
};

const curto = (t: string) => { const k = t.indexOf(' para '); return k > 0 ? t.slice(0, k) : t; };
const dia = (x: Date | null | undefined) => (x ?? new Date()).toISOString().slice(0, 10);
const nomeStatus = (c: string) => (c === 'quinzenal' ? 'o status quinzenal' : c === 'mensal' ? 'o status do mês' : 'o status da semana');

/** Entregas com data da própria pessoa: tarefas, gates (fim de fase) e status report. As decisões do gestor entram pelo bloco do gestor. */
function minhasEntregas(d: DadosOrg, eu: Pessoa, hoje: string): ItemCaixa[] {
  const res: ItemCaixa[] = [];
  const minhas = entregas(d, hoje).filter((e) => e.responsavelId === eu.id && e.tipo !== 'decisao');
  const limite = addDias(hoje, 7);
  let adiante = 0;
  let proxAdiante = '';
  for (const e of minhas) {
    const atrasado = e.diasAtraso > 0 && !e.emNegociacao;
    const negocia = e.emNegociacao ? ' · prazo em negociação com o GP' : '';
    if (e.tipo === 'status') {
      const ini = d.iniciativas.find((i) => i.id === e.iniciativaId);
      if (!ini || !situacaoStatus(e.vencimento, hoje)) continue; // o status só aparece a 7 dias de vencer (cadência do projeto)
      res.push({ id: `st-${ini.id}`, papel: 'GP', titulo: `Publicar ${nomeStatus(ini.statusCadencia)}`, sub: `${e.projeto} · ${rotuloVencimentoStatus(e.vencimento, hoje)}`,
        href: `/projetos/${ini.id}#status`, acao: 'Escrever →', tom: atrasado ? 'vermelho' : 'roxo', vence: e.vencimento, atrasado });
      continue;
    }
    if (!atrasado && e.vencimento > limite) { adiante++; if (!proxAdiante || e.vencimento < proxAdiante) proxAdiante = e.vencimento; continue; }
    if (e.tipo === 'fase') {
      const f = d.fases.find((x) => x.id === e.id);
      res.push({ id: `fase-${e.id}`, papel: 'Você', titulo: e.titulo, sub: `${e.projeto} · gate · ${venceTextoCurto(e.vencimento, hoje)}${f?.criterioConclusao ? ` · critério: ${f.criterioConclusao.charAt(0).toLowerCase()}${f.criterioConclusao.slice(1)}` : ''}${negocia}`,
        href: `/projetos/${e.iniciativaId}?fase=${e.id}`, acao: 'Confirmar →', tom: atrasado ? 'vermelho' : 'roxo', vence: e.vencimento, atrasado });
    } else {
      res.push({ id: `tarefa-${e.id}`, papel: 'Você', titulo: e.titulo, sub: `${e.projeto} · tarefa · ${venceTextoCurto(e.vencimento, hoje)}${negocia}`,
        href: '/minhas-entregas', acao: atrasado ? 'Resolver →' : 'Ver →', tom: atrasado ? 'vermelho' : 'roxo', vence: e.vencimento, atrasado });
    }
  }
  if (adiante) {
    res.push({ id: 'entregas-adiante', papel: 'Você', titulo: adiante === 1 ? 'Uma entrega mais adiante' : `${adiante} entregas mais adiante`, sub: `A próxima vence em ${br(proxAdiante)}. Veja todas em Minhas entregas.`,
      href: '/minhas-entregas', acao: 'Ver →', numero: adiante, tom: 'neutro', vence: proxAdiante || null });
  }
  return res;
}

/** Quem pediu: iniciativas devolvidas e rascunhos, e benefícios para medir. */
function doColaborador(d: DadosOrg, eu: Pessoa): ItemCaixa[] {
  const res: ItemCaixa[] = [];
  for (const i of d.iniciativas.filter((x) => x.solicitanteId === eu.id && chaveDaRaia(d, x.raiaId) === 'sol')) {
    if (i.solStatus === 'devolvida') {
      res.push({ id: `devolvida-${i.id}`, papel: 'Você', titulo: `Iniciativa devolvida: ${i.titulo}`, sub: `${pessoa(d, i.aprovadorId)?.nome ?? 'Seu gestor'} devolveu para ajustes. O comentário está em Suas iniciativas, logo abaixo.`,
        href: `/iniciativas/${i.id}/editar`, acao: 'Ajustar →', tom: 'ambar', fazer: true });
    } else if (i.solStatus === 'rascunho') {
      res.push({ id: `rascunho-${i.id}`, papel: 'Você', titulo: `Continuar o rascunho: ${i.titulo}`, sub: 'Ainda não foi enviado para aprovação.', href: `/iniciativas/${i.id}/editar`, acao: 'Continuar →', tom: 'neutro', fazer: true });
    }
  }
  return res;
}

function beneficios(d: DadosOrg, eu: Pessoa, ehPmo: boolean, hoje: string): ItemCaixa[] {
  const aMedir = beneficiosParaMedir(d, eu.id, ehPmo, hoje);
  if (!aMedir.length) return [];
  return [{ id: 'beneficios', papel: ehPmo ? 'PMO' : 'Você', href: '/beneficios', numero: aMedir.length, titulo: aMedir.length === 1 ? 'Benefício para medir' : 'Benefícios para medir',
    sub: aMedir.slice(0, 3).map((i) => `${curto(i.titulo)}: ${i.beneficioIndicador}`).join(' · '), acao: 'Registrar →', fazer: true }];
}

function doGestor(d: DadosOrg, eu: Pessoa, hoje: string): ItemCaixa[] {
  const res: ItemCaixa[] = [];
  const rep = representados(d, eu.id, hoje); // eu + gestores que me deixaram como substituto(a)
  const espera = (x: Date | null) => (x ? Math.max(0, diffDias(hoje, x.toISOString().slice(0, 10))) : 0);
  for (const x of d.delegacoes.filter((y) => y.substitutoId === eu.id && y.inicio <= hoje && y.fim >= hoje)) {
    res.push({ id: `sub${x.id}`, papel: 'Gestor', href: '/area/iniciativas', titulo: `Você está substituindo ${pessoa(d, x.gestorId)?.nome ?? ''} até ${br(x.fim).slice(0, 5)}`,
      sub: 'As aprovações, os pedidos de alocação e o time dele(a) aparecem junto com os seus.', acao: 'Ver →' });
  }
  const minhasAreas = new Set(areasSobGestao(eu.id, d.areas));
  const estourando = d.iniciativas.filter((i) => i.areaId && minhasAreas.has(i.areaId) && noRaia(d, i, 'exe', 'pau')).map((i) => ({ i, f: financeiroDo(d, i) })).filter((x) => x.f.situacao === 'crit');
  if (estourando.length) {
    res.push({ id: 'custo-area', papel: 'Gestor', href: '/relatorios?r.financeiro.situacao=crit#financeiro', numero: estourando.length, tom: 'vermelho',
      titulo: estourando.length === 1 ? 'Projeto da área estourando o orçamento' : 'Projetos da área estourando o orçamento',
      sub: estourando.map((x) => `${curto(x.i.titulo)} (+${x.f.desvioPct}%)`).join(' · '), acao: 'Ver custos →' });
  }
  const time = timeDireto(eu.id, d.pessoas, d.areas);
  const doTime = atrasos(d, hoje).filter((x) => time.some((p) => p.id === x.responsavelId));
  if (doTime.length) {
    const nomes = [...new Set(doTime.map((x) => pessoa(d, x.responsavelId)?.nome ?? ''))];
    res.push({ id: 'muro-time', papel: 'Gestor', href: '/muro', numero: nomes.length, tom: 'vermelho', titulo: nomes.length === 1 ? 'Pessoa do seu time com entregas atrasadas' : 'Pessoas do seu time com entregas atrasadas',
      sub: `${nomes.join(', ')} · ${doTime.length} ${doTime.length === 1 ? 'entrega' : 'entregas'} vencida(s) sem registro`, acao: 'Ver →' });
  }
  const aprovacoes = d.iniciativas.filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && !!i.aprovadorId && rep.has(i.aprovadorId))
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0));
  const urgentes = aprovacoes.filter((i) => i.tipo === 'obr' || i.urgencia === 'urg');
  const demais = aprovacoes.filter((i) => !urgentes.includes(i));
  for (const i of urgentes) {
    res.push({ id: `aprovar-${i.id}`, papel: 'Gestor', href: '/area/iniciativas', tom: 'ambar', titulo: `Aprovar: ${i.titulo}`, bloqueia: true, vence: prazoDecisao(dia(i.enviadaEm)),
      sub: `${pessoa(d, i.solicitanteId)?.nome ?? ''} · ${i.tipo === 'obr' ? 'obrigatória' : 'urgente'} · esperando há ${espera(i.enviadaEm)} ${espera(i.enviadaEm) === 1 ? 'dia' : 'dias'}`, acao: 'Decidir →' });
  }
  if (demais.length === 1) {
    const i = demais[0];
    res.push({ id: 'aprovar-demais', papel: 'Gestor', href: '/area/iniciativas', titulo: `Aprovar: ${i.titulo}`, sub: `${pessoa(d, i.solicitanteId)?.nome ?? ''} · enviada há ${espera(i.enviadaEm)} dia(s)`, acao: 'Decidir →', bloqueia: true, vence: prazoDecisao(dia(i.enviadaEm)) });
  } else if (demais.length > 1) {
    res.push({ id: 'aprovar-demais', papel: 'Gestor', href: '/area/iniciativas', titulo: `Aprovar ${urgentes.length ? 'mais ' : ''}${demais.length} iniciativas do time`, bloqueia: true, vence: prazoDecisao(dia(demais[0].enviadaEm)),
      sub: demais.map((i) => `${i.titulo} (${primeiroNome(pessoa(d, i.solicitanteId)?.nome ?? '')})`).join(' · '), acao: 'Decidir →' });
  }
  const pontos = d.pontos.filter((x) => pontoEsperaPor(x, eu.id, false));
  if (pontos.length) res.push(itemPontos(d, pontos, hoje, 'Gestor'));
  for (const p of d.pedidos.filter((x) => x.status === 'pendente' && rep.has(gestorDe(pessoa(d, x.pessoaId)!, d.areas) ?? ''))) {
    const proj = d.iniciativas.find((i) => i.id === p.iniciativaId);
    res.push({ id: `pedido-${p.id}`, papel: 'Gestor', href: '/area/time', titulo: 'Pedido de alocação', bloqueia: true, vence: prazoDecisao(dia(p.createdAt)),
      sub: `${proj?.titulo ?? ''} pede +${p.deltaPct}% de ${pessoa(d, p.pessoaId)?.nome ?? ''}${p.aPartirDe ? ` a partir de ${p.aPartirDe}` : ''}`, acao: 'Responder →' });
  }
  for (const x of time.map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje) })).filter((x) => x.p.cedeAte != null && x.aloc > x.p.cedeAte)) {
    res.push({ id: `acima-${x.p.id}`, papel: 'Gestor', href: '/area/time', titulo: `${x.p.nome} está acima do que você cedeu`, sub: `${x.aloc}% em projetos, limite de ${x.p.cedeAte}%`, acao: 'Ajustar →' });
  }
  return res;
}

function itemPontos(d: DadosOrg, pontos: DadosOrg['pontos'], hoje: string, papel: Papel): ItemCaixa {
  const atrasados = pontos.filter((x) => pontoAtrasado(x, hoje)).length;
  return {
    id: 'pontos', papel, href: '/pontos', numero: pontos.length, tom: atrasados ? 'vermelho' : 'roxo', bloqueia: true, atrasado: atrasados > 0,
    titulo: pontos.length === 1 ? 'Ponto de atenção esperando por você' : 'Pontos de atenção esperando por você',
    sub: pontos.map((x) => `${x.titulo} (${curto(d.iniciativas.find((i) => i.id === x.iniciativaId)?.titulo ?? '')})`).join(' · ') + (atrasados ? ` · ${atrasados} com prazo vencido` : ''), acao: 'Resolver →',
  };
}

function doGp(d: DadosOrg, eu: Pessoa, hoje: string): ItemCaixa[] {
  const res: ItemCaixa[] = [];
  const meus = d.iniciativas.filter((i) => i.gpId === eu.id && noRaia(d, i, 'exe'));
  const infos = meus.map((i) => ({ i, info: infoProjeto(d, i, hoje) }));
  const daEquipe = atrasos(d, hoje).filter((x) => x.gpId === eu.id && x.responsavelId !== eu.id);
  if (daEquipe.length) {
    res.push({ id: 'muro-equipe', papel: 'GP', href: '/muro', numero: daEquipe.length, tom: 'vermelho', titulo: 'Atrasos da equipe nos seus projetos',
      sub: daEquipe.slice(0, 3).map((x) => `${pessoa(d, x.responsavelId)?.nome ?? ''}: ${x.titulo} (${x.diasAtraso}d)`).join(' · '), acao: 'Ver muro →' });
  }
  for (const x of d.pedidosPrazo.filter((y) => y.status === 'pendente' && d.iniciativas.some((i) => i.id === y.iniciativaId && i.gpId === eu.id))) {
    res.push({ id: `prazo${x.id}`, papel: 'GP', href: `/projetos/${x.iniciativaId}#prazos`, titulo: 'Pedido de mais prazo', sub: `${pessoa(d, x.solicitanteId)?.nome ?? ''}: ${x.motivo}`, acao: 'Decidir →', bloqueia: true });
  }
  const pontosGp = d.pontos.filter((x) => x.destino === 'gp' && pontoEsperaPor(x, eu.id, false));
  if (pontosGp.length) {
    res.push({ id: 'pontos-gp', papel: 'GP', href: '/pontos', numero: pontosGp.length, tom: 'vermelho', bloqueia: true,
      titulo: pontosGp.length === 1 ? 'Impedimento informado pela equipe' : 'Impedimentos informados pela equipe', sub: pontosGp.map((x) => x.titulo).join(' · '), acao: 'Resolver →' });
  }
  const semFeedback = d.iniciativas.filter((i) => i.gpId === eu.id && noRaia(d, i, 'exe', 'pau', 'con')).flatMap((i) => equipeParaFeedback(d, i, hoje).filter((x) => x.pendente).map((x) => ({ i, x })));
  if (semFeedback.length) {
    res.push({ id: 'feedback', papel: 'GP', href: `/projetos/${semFeedback[0].i.id}#feedback`, numero: semFeedback.length, fazer: true,
      titulo: semFeedback.length === 1 ? 'Feedback pendente de quem trabalhou com você' : 'Feedbacks pendentes de quem trabalhou com você',
      sub: semFeedback.slice(0, 4).map(({ i, x }) => `${x.pessoa.nome} (${curto(i.titulo)})`).join(' · ') + '. O gestor de cada pessoa usa isso.', acao: 'Avaliar →' });
  }
  for (const c of conflitosDeAusencia(d, hoje).filter((x) => x.projeto.gpId === eu.id)) {
    res.push({ id: `aus${c.ausencia.id}${c.projeto.id}${c.fase}`, papel: 'GP', href: `/projetos/${c.projeto.id}`, tom: 'ambar', titulo: `${c.pessoa.nome} estará ausente (${c.ausencia.motivo.toLowerCase()})`,
      sub: `${br(c.ausencia.inicio).slice(0, 5)} a ${br(c.ausencia.fim).slice(0, 5)} · alocado(a) em ${c.pct}% na fase ${c.fase} do ${curto(c.projeto.titulo)}. Replaneje ou combine a cobertura.`, acao: 'Ver projeto →' });
  }
  const atrasadas = infos.flatMap(({ i, info }) => info.atrasadas.filter((t) => t.responsavelId && t.responsavelId !== eu.id).map((t) => ({ i, t })));
  if (atrasadas.length) {
    const { i, t } = atrasadas[0];
    res.push({ id: 'atr', papel: 'GP', href: `/projetos/${i.id}`, tom: 'vermelho', titulo: atrasadas.length === 1 ? '1 tarefa da equipe atrasada' : `${atrasadas.length} tarefas da equipe atrasadas`,
      sub: `${t.titulo} · ${pessoa(d, t.responsavelId)?.nome ?? ''} · venceu ${br(t.prazo).slice(0, 5)}`, acao: 'Ver →' });
  }
  for (const p of d.pedidos.filter((x) => x.status === 'pendente' && meus.some((m) => m.id === x.iniciativaId))) {
    const quem = pessoa(d, p.pessoaId);
    const gestor = quem ? pessoa(d, gestorDe(quem, d.areas)) : undefined;
    res.push({ id: `aguarda-${p.id}`, papel: 'GP', href: `/projetos/${p.iniciativaId}`, titulo: `Pedido de alocação aguardando o gestor de ${nomeArea(d, quem?.areaId)}`,
      sub: `${quem?.nome ?? ''} a ${quem ? alocacaoDe(d, quem.id, hoje) : 0}% · ${gestor?.nome ?? 'O gestor'} ainda não respondeu`, acao: 'Ver →' });
  }
  for (const { i, info } of infos) {
    if (prontoParaConcluir(info.fases) && conclusaoPara(d, i, eu.id, false)) {
      res.push({ id: `concluir${i.id}`, papel: 'GP', href: `/projetos/${i.id}#encerramento`, titulo: 'Concluir o projeto', sub: `${curto(i.titulo)} · todas as fases foram confirmadas. Com o aceite de quem pediu, conclua.`, acao: 'Concluir →', fazer: true });
    }
  }
  for (const y of dependenciasVM(d, hoje).filter((z) => (z.situacao === 'risco' || z.situacao === 'atrasada') && (z.dep.gpId === eu.id || z.de.gpId === eu.id))) {
    const meuLado = y.dep.gpId === eu.id ? y.dep : y.de;
    res.push({ id: `dep${y.x.id}`, papel: 'GP', href: `/projetos/${meuLado.id}#dependencias`, tom: 'vermelho',
      titulo: y.dep.gpId === eu.id ? `Dependência em risco: ${y.x.descricao}` : `Outro projeto depende de você: ${y.x.descricao}`,
      sub: `${curto(y.dep.titulo)} precisa de ${curto(y.de.titulo)} até ${br(y.x.precisaAte).slice(0, 5)}`, acao: 'Ver →', bloqueia: y.de.gpId === eu.id });
  }
  return res;
}

function doPmo(d: DadosOrg, eu: Pessoa, admin: boolean, hoje: string): ItemCaixa[] {
  const res: ItemCaixa[] = [];
  const exe = d.iniciativas.filter((i) => noRaia(d, i, 'exe'));
  const noMuro = atrasos(d, hoje);
  if (noMuro.length) {
    const n = new Set(noMuro.map((x) => x.responsavelId)).size;
    res.push({ id: 'muro', papel: 'PMO', href: '/muro', numero: noMuro.length, tom: 'vermelho', titulo: 'Entregas atrasadas no portfólio (muro da vergonha)', sub: `${n} ${n === 1 ? 'pessoa' : 'pessoas'} com tarefas, gates ou status vencidos sem registro`, acao: 'Ver muro →' });
  }
  const paradas = noMuro.filter((x) => x.tipo === 'decisao');
  if (paradas.length) {
    const gestores = [...new Set(paradas.map((x) => x.responsavelId))].map((id) => pessoa(d, id)?.nome.split(' ')[0] ?? '');
    res.push({ id: 'decisoes', papel: 'PMO', href: '/muro', numero: paradas.length, tom: 'vermelho', titulo: paradas.length === 1 ? 'Decisão parada com gestor há mais de 5 dias' : 'Decisões paradas com gestores há mais de 5 dias',
      sub: `${gestores.join(', ')} · aprovações, pedidos de alocação ou pontos de atenção sem resposta`, acao: 'Ver muro →' });
  }
  const av = listaAvaliacao(d);
  const prontas = av.itens.filter((x) => !x.comunicado && !x.decisao).length;
  if (prontas) res.push({ id: 'av', papel: 'PMO', href: '/avaliacao', numero: prontas, titulo: prontas === 1 ? 'Iniciativa pronta para avaliar' : 'Iniciativas prontas para avaliar', sub: `Já aprovadas pelos gestores${av.ciclo ? ` no ciclo ${av.ciclo.ano}` : ''}`, acao: 'Avaliar →', bloqueia: true });
  const criticos = exe.filter((i) => i.farol === 'crit');
  if (criticos.length === 1) {
    const c = criticos[0];
    const info = infoProjeto(d, c, hoje);
    const partes = [info.desvio && info.desvio > 0 ? `${info.desvio} semana(s) de atraso` : 'Farol crítico', info.ultimoStatus ? `último status em ${br(info.ultimoStatus.data).slice(0, 5)}` : 'sem status publicado'];
    res.push({ id: 'crit', papel: 'PMO', href: `/projetos/${c.id}`, numero: 1, tom: 'vermelho', titulo: `${c.titulo} está crítico`, sub: partes.join(' · '), acao: 'Ver →' });
  } else if (criticos.length > 1) {
    res.push({ id: 'crit', papel: 'PMO', href: '/portfolio', numero: criticos.length, tom: 'vermelho', titulo: `${criticos.length} projetos críticos`, sub: criticos.map((c) => c.titulo).join(' · '), acao: 'Ver →' });
  }
  const estourando = d.iniciativas.filter((i) => noRaia(d, i, 'exe', 'pau')).map((i) => ({ i, f: financeiroDo(d, i) })).filter((x) => x.f.situacao === 'crit');
  if (estourando.length) {
    res.push({ id: 'custo', papel: 'PMO', href: '/relatorios?r.financeiro.situacao=crit#financeiro', numero: estourando.length, tom: 'vermelho', titulo: estourando.length === 1 ? 'Projeto estourando o orçamento' : 'Projetos estourando o orçamento',
      sub: estourando.map((x) => `${curto(x.i.titulo)} (+${x.f.desvioPct}%)`).join(' · '), acao: 'Ver →' });
  }
  const fasesAtivas = new Set(d.fases.filter((f) => d.iniciativas.some((i) => i.id === f.iniciativaId && noRaia(d, i, 'exe', 'pau'))).map((f) => f.id));
  const altosSemPlano = d.riscos.filter((r) => fasesAtivas.has(r.faseId) && r.nivel === 'Alto' && riscoAtivo(r.status) && !r.plano);
  if (altosSemPlano.length) {
    res.push({ id: 'riscos', papel: 'PMO', href: '/relatorios?r.riscos.nivel=Alto&r.riscos.plano=sem#riscos', numero: altosSemPlano.length, tom: 'ambar', badgeTom: 'ambar',
      titulo: altosSemPlano.length === 1 ? 'Risco alto sem plano de resposta' : 'Riscos altos sem plano de resposta',
      sub: altosSemPlano.slice(0, 3).map((r) => r.nome).join(' · ') + (altosSemPlano.length > 3 ? ` +${altosSemPlano.length - 3}` : ''), acao: 'Ver →' });
  }
  const depsRuins = dependenciasVM(d, hoje).filter((y) => y.situacao === 'risco' || y.situacao === 'atrasada');
  if (depsRuins.length) {
    res.push({ id: 'deps', papel: 'PMO', href: '/relatorios?r.dependencias.situacao=ruins#dependencias', numero: depsRuins.length, tom: 'vermelho', titulo: depsRuins.length === 1 ? 'Dependência entre projetos em risco' : 'Dependências entre projetos em risco',
      sub: depsRuins.slice(0, 3).map((y) => `${curto(y.dep.titulo)} ← ${curto(y.de.titulo)}`).join(' · '), acao: 'Ver →' });
  }
  for (const m of d.pedidosMudanca.filter((x) => x.status === 'pendente')) {
    const proj = d.iniciativas.find((i) => i.id === m.iniciativaId);
    res.push({ id: m.id, papel: 'PMO', href: `/projetos/${m.iniciativaId}#mudancas`, numero: 1, titulo: `Pedido de mudança de ${m.tipo === 'custo' ? 'custo' : 'escopo'}`, sub: `${proj?.titulo ?? ''} · ${pessoa(d, m.solicitanteId)?.nome ?? ''}: ${m.descricao}`, acao: 'Decidir →', bloqueia: true });
  }
  const pontos = d.pontos.filter((x) => pontoEsperaPor(x, eu.id, true));
  if (pontos.length) res.push(itemPontos(d, pontos, hoje, 'PMO'));
  for (const m of d.mudancas.filter((x) => x.status === 'pendente')) {
    const proj = d.iniciativas.find((i) => i.id === m.iniciativaId);
    res.push({ id: m.id, papel: 'PMO', href: `/projetos/${m.iniciativaId}`, numero: 1, titulo: 'Pedido para alterar linha de base', sub: `${proj?.titulo ?? ''} · ${pessoa(d, m.solicitanteId)?.nome ?? ''} pede ${m.descricao}`, acao: 'Decidir →', bloqueia: true });
  }
  const stAtrasados = exe.filter((i) => infoProjeto(d, i, hoje).statusAtrasado);
  if (stAtrasados.length) {
    res.push({ id: 'st', papel: 'PMO', href: '/projetos', numero: stAtrasados.length, titulo: 'Status atrasados', sub: stAtrasados.map((a) => a.titulo).join(' e '), acao: '', cobrarIds: stAtrasados.map((a) => a.id) });
  }
  const pre = d.iniciativas.filter((i) => noRaia(d, i, 'pre'));
  if (pre.length) {
    const exeR = raiaChave(d, 'exe');
    const total = exeR?.criterios.length ?? 5;
    const top = pre.map((i) => ({ i, n: ((exeR && i.progressoGates[exeR.id]) || []).filter(Boolean).length })).sort((a, b) => b.n - a.n)[0];
    res.push({ id: 'pre', papel: 'PMO', href: '/portfolio', numero: pre.length, titulo: pre.length === 1 ? 'Pré-projeto pronto para o play' : 'Pré-projetos prontos para o play', sub: `${top.i.titulo} está com ${top.n} de ${total} critérios`, acao: 'Ver →' });
  }
  const acima = pessoasAcimaDoCedido(d, hoje);
  if (acima.length) {
    res.push({ id: 'cap', papel: 'PMO', href: admin ? '/cadastros' : '/portfolio', numero: acima.length, badgeTom: 'ambar', titulo: acima.length === 1 ? 'Pessoa alocada acima do cedido' : 'Pessoas alocadas acima do cedido',
      sub: acima.map((x) => `${x.pessoa.nome} (${nomeArea(d, x.pessoa.areaId)}) ${x.alocacao}% de ${x.pessoa.cedeAte}%`).join(' · '), acao: 'Ver →' });
  }
  return res;
}

/** Patrocinador ou quem pediu, quando a conclusão é com eles (aprovador configurado) e todas as fases foram confirmadas. */
function doPatrocinador(d: DadosOrg, eu: Pessoa): ItemCaixa[] {
  return d.iniciativas.filter((i) => i.gpId !== eu.id && i.inicioProjeto && noRaia(d, i, 'exe'))
    .filter((i) => conclusaoPara(d, i, eu.id, false)?.pronto)
    .map((i) => ({ id: `aceite${i.id}`, papel: (i.patrocinadorId === eu.id ? 'Patrocinador' : 'Você') as Papel, href: `/projetos/${i.id}#encerramento`, titulo: 'Dar o aceite e concluir o projeto',
      sub: `${curto(i.titulo)} · todas as fases foram confirmadas e a conclusão é com você.`, acao: 'Concluir →', bloqueia: true }));
}

/**
 * A caixa única de uma pessoa: as entregas dela e o que depende dela em cada papel que ela tem
 * (gestor, GP, PMO, patrocinador), sem repetir, em ordem de prioridade.
 */
export function caixaDe(d: DadosOrg, eu: Pessoa, admin: boolean, hoje: string) {
  const ehPmo = eu.perfis.includes('pmo');
  const ehGestor = eu.perfis.includes('gestor') || d.delegacoes.some((x) => x.substitutoId === eu.id && x.inicio <= hoje && x.fim >= hoje);
  const ehGp = eu.perfis.includes('gp') || d.iniciativas.some((i) => i.gpId === eu.id);
  const todos = [
    ...minhasEntregas(d, eu, hoje),
    ...(ehPmo ? doPmo(d, eu, admin, hoje) : []),
    ...beneficios(d, eu, ehPmo, hoje),
    ...(ehGestor ? doGestor(d, eu, hoje) : []),
    ...(ehGp ? doGp(d, eu, hoje) : []),
    ...doPatrocinador(d, eu),
    ...doColaborador(d, eu),
  ];
  const vistos = new Set<string>();
  const unicos = todos.filter((x) => (vistos.has(x.id) ? false : (vistos.add(x.id), true)));
  const papeis = new Set(unicos.map((x) => x.papel));
  return { itens: ordenarCaixa(unicos, hoje), variosPapeis: papeis.size > 1 };
}

export type { GrupoCaixa };
