import { describe, it, expect } from 'vitest';
import { notaFinal, custoReferencia, ordenarPorNota, podeComunicar } from './avaliacao';
import { acoesDoCard, acaoDeConclusao, prontoParaConcluir, retiradaPermitida, validarRetirada, validarGate, podeConfirmar, type Raia } from './esteira';
import { desvio, farolSugerido, statusDaFase, fasesDoModelo, mesesDaLinha, descreverMudanca, progresso, reordenar, ordemValida, validarEdicaoTarefa, modoDoProjeto } from './projeto';
import { podeResolverPonto, pontoEsperaPor, pontoAtrasado } from './pontos';
import { validarPedidoMudanca, variacaoCusto } from './mudancas';
import { resumoFinanceiro, situacaoCusto } from './financeiro';
import { dimCusto, dimEscopo, dimPrazo, dimRiscos, farolGeral } from './farol';
import { nivelDoRisco, riscoAtivo, validarRisco } from './riscos';
import { validarFeedback, feedbackPendente } from './feedback';
import { substitutoAtivo, quemDecide, gestoresRepresentados, validarDelegacao } from './delegacao';
import { diasAusente, fracaoAusente, cruza, validarAusencia } from './ausencias';
import { validarNaoSeguir, ordenarPrioridadeArea, prazoDecisao } from './gestor';
import { picoNoPeriodo, situacaoCapacidade, pessoasEq, impactoPorMes } from './capacidade';
import { podeMedirBeneficio, situacaoBeneficio, validarMedicao } from './beneficios';
import { situacaoDependencia } from './dependencias';
import { balancoCusto, balancoEscopo, balancoPrazo, validarLicao } from './encerramento';
import { diaDaSemana, diasDeAtraso, emNegociacao, proximoDiaSemana, proximoStatusDevido, validarPedidoPrazo, situacaoStatus, rotuloVencimentoStatus } from './muro';
import { gestorDe, timeDireto, areasSobGestao, nomeCurto, acimaDoCedido, patrocinadorValido } from './pessoas';
import { addDias, diffDias, dataPorExtenso, haQuanto, proximaSexta } from './datas';

const raia = (chave: string, ordem: number, extra: Partial<Raia> = {}): Raia => ({
  id: chave, chave, nome: chave, descricao: '', aprovador: 'PMO', tipoCard: 'Iniciativa', ordem, saida: false,
  criterios: [{ texto: 'a', obrigatorio: true }], gateTitulo: null, gateDica: null, gateConfirmar: null, acaoRotulo: chave.toUpperCase(),
  criteriosRetomada: [{ texto: 'r', obrigatorio: true }], ...extra,
});
const RAIAS = [raia('sol', 1), raia('bkl', 2), raia('pre', 3), raia('exe', 4, { tipoCard: 'Projeto' }), raia('pau', 5, { tipoCard: 'Projeto' }), raia('con', 6, { tipoCard: 'Projeto' }), raia('can', 7, { saida: true })];

describe('avaliação', () => {
  it('calcula a nota ponderada como no protótipo', () => {
    // Migração do ERP: [5,3,5,1] com pesos 35/25/25/15 → (175+75+125+15)/5 = 78
    expect(notaFinal([5, 3, 5, 1], [35, 25, 25, 15])).toBe(78);
    expect(notaFinal([3, 5, 3, 5], [35, 25, 25, 15])).toBe(76);
  });
  it('sem todas as notas não há nota final', () => {
    expect(notaFinal([5, 0, 5, 1], [35, 25, 25, 15])).toBeNull();
  });
  it('ordena por nota com "sem nota" no fim', () => {
    const r = ordenarPorNota([{ n: null }, { n: 50 }, { n: 80 }], (x) => x.n);
    expect(r.map((x) => x.n)).toEqual([80, 50, null]);
  });
  it('custo de referência usa o estimado ou o teto da faixa', () => {
    expect(custoReferencia('R$ 10–50 mil', null)).toBe(50000);
    expect(custoReferencia('R$ 10–50 mil', 30000)).toBe(30000);
    expect(custoReferencia('Não sei', null)).toBe(0);
  });
  it('não comunica com iniciativa sem decisão', () => {
    expect(podeComunicar(['pre', null, 'rec'])).toEqual({ ok: false, semDecisao: 1 });
    expect(podeComunicar(['pre', 'bkl']).ok).toBe(true);
  });
});

describe('esteira', () => {
  it('solicitação aguardando gestor tem o gate do gestor e pode ser cancelada', () => {
    const a = acoesDoCard({ raiaId: 'sol', solStatus: 'aguardando_gestor' }, RAIAS);
    expect(a.primaria?.tipo).toBe('aprovar_gestor');
    expect(a.primaria?.paraRaiaId).toBe('sol');
    expect(a.cancelar).toBeDefined();
  });
  it('aprovada pelo gestor avança para o backlog (Classificar)', () => {
    const a = acoesDoCard({ raiaId: 'sol', solStatus: 'aguardando_pmo' }, RAIAS);
    expect(a.primaria?.paraRaiaId).toBe('bkl');
  });
  it('devolvida não tem ação principal (depende do solicitante)', () => {
    expect(acoesDoCard({ raiaId: 'sol', solStatus: 'devolvida' }, RAIAS).primaria).toBeUndefined();
  });
  it('em execução: concluir pula o Pausado; pausar é secundária; não cancela direto', () => {
    const a = acoesDoCard({ raiaId: 'exe', solStatus: null }, RAIAS);
    expect(a.primaria?.paraRaiaId).toBe('con');
    expect(a.secundaria?.paraRaiaId).toBe('pau');
    expect(a.cancelar).toBeUndefined();
  });
  it('pausado retoma para execução com os critérios de retomada', () => {
    const a = acoesDoCard({ raiaId: 'pau', solStatus: null }, RAIAS);
    expect(a.primaria?.tipo).toBe('retomar');
    expect(a.primaria?.paraRaiaId).toBe('exe');
    expect(a.primaria?.criterios[0].texto).toBe('r');
    expect(a.cancelar).toBeDefined();
  });
  it('raia nova no meio do fluxo entra na esteira', () => {
    const comNova = [...RAIAS, raia('nova', 3.5, { chave: null, id: 'nova', acaoRotulo: null, nome: 'Comitê' })];
    expect(acoesDoCard({ raiaId: 'pre', solStatus: null }, comNova).primaria?.paraRaiaId).toBe('nova');
    expect(acoesDoCard({ raiaId: 'nova', solStatus: null }, comNova).primaria?.paraRaiaId).toBe('exe');
    expect(acoesDoCard({ raiaId: 'pre', solStatus: null }, comNova).primaria?.rotulo).toBe('Mover para Comitê');
  });
  it('gate exige todos os obrigatórios', () => {
    const crit = [{ texto: 'a', obrigatorio: true }, { texto: 'b', obrigatorio: true }, { texto: 'c', obrigatorio: false }];
    expect(validarGate(crit, [true, false, false]).mensagem).toBe('Falta 1 critério para avançar.');
    expect(validarGate(crit, [false, false, true]).mensagem).toBe('Faltam 2 critérios para avançar.');
    expect(validarGate(crit, [true, true, false]).ok).toBe(true);
  });
  it('permissão por aprovador da raia; PMO sempre pode', () => {
    const base = { ehPmo: false, ehSolicitante: false, ehAprovador: false, ehGp: false, ehPatrocinador: false };
    expect(podeConfirmar('Gestor da área solicitante', { ...base, ehAprovador: true })).toBe(true);
    expect(podeConfirmar('Gestor da área solicitante', { ...base, ehGp: true })).toBe(false);
    expect(podeConfirmar('Gerente de projeto', { ...base, ehPmo: true })).toBe(true);
    // aceite do patrocinador na conclusão, quando configurado
    expect(podeConfirmar('Patrocinador', { ...base, ehPatrocinador: true })).toBe(true);
    expect(podeConfirmar('Patrocinador', { ...base, ehGp: true })).toBe(false);
  });
  it('concluir pela página do projeto: só em execução e só quando a próxima raia é Concluído', () => {
    expect(acaoDeConclusao({ raiaId: 'exe', solStatus: null }, RAIAS)?.paraRaiaId).toBe('con');
    expect(acaoDeConclusao({ raiaId: 'pau', solStatus: null }, RAIAS)).toBeUndefined();
    expect(acaoDeConclusao({ raiaId: 'pre', solStatus: null }, RAIAS)).toBeUndefined();
    // raia nova entre execução e concluído: a passagem não é a conclusão
    const comNova = [...RAIAS, raia('aceite', 4.5, { chave: null, id: 'aceite', tipoCard: 'Projeto' })];
    expect(acaoDeConclusao({ raiaId: 'exe', solStatus: null }, comNova)).toBeUndefined();
  });
  it('pronto para concluir quando todas as fases tiveram o fim confirmado', () => {
    expect(prontoParaConcluir([])).toBe(false);
    expect(prontoParaConcluir([{ confirmadaEm: new Date() }, { confirmadaEm: null }])).toBe(false);
    expect(prontoParaConcluir([{ confirmadaEm: new Date() }, { confirmadaEm: '2026-10-01' }])).toBe(true);
  });
});

describe('projeto', () => {
  const plano = [{ id: 'a', nome: 'A', inicioSemana: 0, duracao: 2 }, { id: 'b', nome: 'Testes', inicioSemana: 2, duracao: 3 }];
  it('desvio contra a linha de base', () => {
    expect(desvio(plano, null)).toBeNull();
    expect(desvio([plano[0], { ...plano[1], duracao: 5 }], plano)).toBe(2);
  });
  it('farol sugerido segue as faixas do protótipo', () => {
    expect(farolSugerido(3, 0).farol).toBe('crit');
    expect(farolSugerido(1, 0).farol).toBe('aten');
    expect(farolSugerido(null, 0).porque).toBe('linha de base ainda não congelada');
    expect(farolSugerido(0, 2).farol).toBe('aten');
    expect(farolSugerido(0, 0).farol).toBe('ok');
  });
  it('status da fase pela data (projeto começa em 07/09/2026, hoje 17/10/2026)', () => {
    expect(statusDaFase({ inicioSemana: 0, duracao: 2 }, '2026-09-07', '2026-10-17')).toBe('Concluída');
    expect(statusDaFase({ inicioSemana: 3, duracao: 3 }, '2026-09-07', '2026-10-17')).toBe('Em andamento');
    expect(statusDaFase({ inicioSemana: 16, duracao: 3 }, '2026-09-07', '2026-10-17')).toBe('Planejada');
  });
  it('fases do modelo em sequência', () => {
    const f = fasesDoModelo([{ nome: 'Iniciação', duracaoSemanas: 2, criterioConclusao: '' }, { nome: 'Planejamento', duracaoSemanas: 3, criterioConclusao: '' }]);
    expect(f[1].inicioSemana).toBe(2);
  });
  it('cabeçalho de meses', () => {
    const m = mesesDaLinha('2026-09-07', 9);
    expect(m[0][0]).toBe('Set 2026');
    expect(m[1][0]).toBe('Out');
    expect(m.reduce((s, x) => s + x[1], 0)).toBe(9);
  });
  it('descreve a mudança de linha de base', () => {
    expect(descreverMudanca(plano, [plano[0], { ...plano[1], duracao: 5 }])).toBe('+2 semanas em Testes');
  });
  it('progresso por tarefas', () => {
    expect(progresso([{ concluida: true }, { concluida: false }])).toBe(50);
    expect(progresso([])).toBe(0);
  });
});

describe('reordenar fases', () => {
  it('move uma fase para cima e para baixo sem mexer nas outras', () => {
    expect(reordenar(['a', 'b', 'c', 'd'], 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(reordenar(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a']);
    expect(reordenar(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
  it('limita o destino às pontas e ignora origem inválida', () => {
    expect(reordenar(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(reordenar(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
    expect(reordenar(['a', 'b'], 7, 0)).toEqual(['a', 'b']);
  });
  it('só aceita a nova ordem com exatamente as fases do projeto', () => {
    expect(ordemValida(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
    expect(ordemValida(['a', 'b', 'c'], ['a', 'b'])).toBe(false);
    expect(ordemValida(['a', 'b', 'c'], ['a', 'a', 'b'])).toBe(false);
    expect(ordemValida(['a', 'b', 'c'], ['a', 'b', 'x'])).toBe(false);
  });
});

describe('pontos de atenção', () => {
  const ponto = (x: Partial<Parameters<typeof podeResolverPonto>[0]> = {}) => ({ status: 'aberto', destino: 'gestor', destinatarioId: 'g', abertoPor: 'gp', prazo: '2026-11-20', ...x });
  it('quem decide: o PMO, o gestor escolhido ou quem abriu (para retirar)', () => {
    expect(podeResolverPonto(ponto(), 'g', false)).toBe(true);
    expect(podeResolverPonto(ponto(), 'pmo', true)).toBe(true);
    expect(podeResolverPonto(ponto(), 'gp', false)).toBe(true);
    expect(podeResolverPonto(ponto(), 'outro', false)).toBe(false);
    expect(podeResolverPonto(ponto({ status: 'resolvido' }), 'g', false)).toBe(false);
  });
  it('espera pelo destino certo e fica atrasado depois do prazo', () => {
    expect(pontoEsperaPor(ponto({ destino: 'pmo' }), 'qualquer', true)).toBe(true);
    expect(pontoEsperaPor(ponto({ destino: 'pmo' }), 'g', false)).toBe(false);
    expect(pontoEsperaPor(ponto(), 'g', false)).toBe(true);
    expect(pontoAtrasado(ponto(), '2026-11-21')).toBe(true);
    expect(pontoAtrasado(ponto(), '2026-11-20')).toBe(false);
    expect(pontoAtrasado(ponto({ prazo: null }), '2030-01-01')).toBe(false);
  });
});

describe('pedidos de mudança de escopo e custo', () => {
  it('valida tipo, descrição e o novo orçamento', () => {
    expect(validarPedidoMudanca({ tipo: 'escopo', descricao: 'Incluir integração com o ERP', valorNovo: null }, 100)).toBeNull();
    expect(validarPedidoMudanca({ tipo: 'prazo', descricao: 'qualquer coisa', valorNovo: null }, 100)).toMatch(/escopo ou de custo/);
    expect(validarPedidoMudanca({ tipo: 'escopo', descricao: 'ab', valorNovo: null }, 100)).toMatch(/Descreva/);
    expect(validarPedidoMudanca({ tipo: 'custo', descricao: 'Licenças extras', valorNovo: null }, 100)).toMatch(/novo orçamento/);
    expect(validarPedidoMudanca({ tipo: 'custo', descricao: 'Licenças extras', valorNovo: 100 }, 100)).toMatch(/igual/);
    expect(validarPedidoMudanca({ tipo: 'custo', descricao: 'Licenças extras', valorNovo: 120 }, 100)).toBeNull();
  });
  it('calcula a variação do custo', () => {
    expect(variacaoCusto(100, 120)).toBe(20);
    expect(variacaoCusto(100, 90)).toBe(-10);
    expect(variacaoCusto(0, 90)).toBeNull();
  });
});

describe('financeiro do projeto', () => {
  it('situação do custo pela previsão e pelo realizado', () => {
    expect(situacaoCusto(100, 50, 100)).toBe('ok');
    expect(situacaoCusto(100, 50, 105)).toBe('aten');
    expect(situacaoCusto(100, 50, 111)).toBe('crit');
    expect(situacaoCusto(100, 101, 100)).toBe('crit');
    expect(situacaoCusto(0, 10, 10)).toBe('ok');
  });
  it('previsão padrão é o orçado e nunca fica abaixo do realizado', () => {
    expect(resumoFinanceiro(200, 50, null, 40)).toMatchObject({ previsao: 200, consumoPct: 25, desvioPct: 0, situacao: 'ok' });
    expect(resumoFinanceiro(200, 230, 180, 90)).toMatchObject({ previsao: 230, consumoPct: 115, desvioPct: 15, situacao: 'crit' });
    expect(resumoFinanceiro(200, 100, 210, 50)).toMatchObject({ desvioPct: 5, situacao: 'aten' });
  });
});

describe('farol por dimensão', () => {
  it('cada dimensão segue sua regra', () => {
    expect(dimPrazo(3, 0).farol).toBe('crit');
    expect(dimPrazo(0, 1).farol).toBe('aten');
    expect(dimCusto('ok', 0, 0)).toMatchObject({ farol: 'aten', porque: 'orçamento não definido' });
    expect(dimCusto('crit', 100, 26).porque).toBe('previsão 26% acima do orçado');
    expect(dimEscopo(1, 0).farol).toBe('aten');
    expect(dimEscopo(0, 2).farol).toBe('aten');
    expect(dimEscopo(0, 1).farol).toBe('ok');
    expect(dimRiscos(2, 0, 0).farol).toBe('crit');
    expect(dimRiscos(0, 1, 1).farol).toBe('crit');
    expect(dimRiscos(1, 0, 0).farol).toBe('aten');
    expect(dimRiscos(0, 0, 0).farol).toBe('ok');
  });
  it('o geral é o pior e explica quem puxou', () => {
    const g = farolGeral([dimPrazo(0, 0), dimCusto('crit', 100, 26), dimEscopo(0, 0), dimRiscos(2, 0, 0)]);
    expect(g.farol).toBe('crit');
    expect(g.porque).toBe('custo: previsão 26% acima do orçado · riscos: 2 risco(s) alto(s)');
    expect(farolGeral([dimPrazo(0, 0), dimCusto('ok', 1, 0), dimEscopo(0, 0), dimRiscos(0, 0, 0)]).farol).toBe('ok');
  });
});

describe('riscos', () => {
  it('nível por probabilidade × impacto', () => {
    expect(nivelDoRisco(3, 3)).toBe('Alto');
    expect(nivelDoRisco(3, 2)).toBe('Alto');
    expect(nivelDoRisco(2, 2)).toBe('Médio');
    expect(nivelDoRisco(1, 3)).toBe('Médio');
    expect(nivelDoRisco(1, 2)).toBe('Baixo');
  });
  it('ativos e validação', () => {
    expect(riscoAtivo('aberto')).toBe(true);
    expect(riscoAtivo('ocorreu')).toBe(true);
    expect(riscoAtivo('mitigado')).toBe(false);
    expect(validarRisco({ nome: 'Atraso do fornecedor', probabilidade: 2, impacto: 3 })).toBeNull();
    expect(validarRisco({ nome: 'ab', probabilidade: 2, impacto: 3 })).toMatch(/Descreva/);
    expect(validarRisco({ nome: 'Atraso', probabilidade: 4, impacto: 3 })).toMatch(/probabilidade/);
    expect(validarRisco({ nome: 'Atraso', probabilidade: 2, impacto: 3, status: 'xpto' })).toMatch(/Status/);
  });
});

describe('capacidade por período', () => {
  const iv = [{ ini: '2026-11-01', fim: '2026-12-15', pct: 30 }, { ini: '2026-12-01', fim: '2027-01-31', pct: 40 }];
  it('pico no período considera só o que se sobrepõe', () => {
    expect(picoNoPeriodo(iv, '2026-11-01', '2026-12-01')).toBe(30);
    expect(picoNoPeriodo(iv, '2026-12-01', '2027-01-01')).toBe(70);
    expect(picoNoPeriodo(iv, '2027-01-01', '2027-02-01')).toBe(40);
    expect(picoNoPeriodo(iv, '2027-02-01', '2027-03-01')).toBe(0);
  });
  it('situação e pessoas-equivalentes', () => {
    expect(situacaoCapacidade(160, 150)).toBe('crit');
    expect(situacaoCapacidade(140, 150)).toBe('aten');
    expect(situacaoCapacidade(50, 150)).toBe('ok');
    expect(situacaoCapacidade(10, 0)).toBe('crit');
    expect(pessoasEq(120)).toBe('1,2');
  });
});

describe('benefícios', () => {
  const b = (x = {}) => ({ beneficioIndicador: 'Tempo de separação', beneficioMedirEm: '2026-12-01', beneficioAtingido: null, ...x });
  it('situação do benefício', () => {
    expect(situacaoBeneficio(b({ beneficioIndicador: null }), '2026-12-10')).toBe('sem');
    expect(situacaoBeneficio(b(), '2026-11-30')).toBe('aguardando');
    expect(situacaoBeneficio(b(), '2026-12-01')).toBe('medir');
    expect(situacaoBeneficio(b({ beneficioAtingido: 'parcial' }), '2026-12-10')).toBe('medido');
  });
  it('quem mede e validação', () => {
    const i = { solicitanteId: 's', aprovadorId: 'g', gpId: 'gp' };
    expect(['s', 'g', 'gp'].every((x) => podeMedirBeneficio(i, x, false))).toBe(true);
    expect(podeMedirBeneficio(i, 'outro', false)).toBe(false);
    expect(podeMedirBeneficio(i, 'outro', true)).toBe(true);
    expect(validarMedicao({ resultado: '14 minutos', atingido: 'sim' })).toBeNull();
    expect(validarMedicao({ resultado: '', atingido: 'sim' })).toMatch(/resultado/);
    expect(validarMedicao({ resultado: '14 min', atingido: 'talvez' })).toMatch(/meta/);
  });
});

describe('dependências', () => {
  it('situação pela data em que se precisa e o fim previsto do outro projeto', () => {
    expect(situacaoDependencia('2027-01-31', '2027-01-15', false, '2026-11-18')).toBe('ok');
    expect(situacaoDependencia('2027-01-31', '2027-02-10', false, '2026-11-18')).toBe('risco');
    expect(situacaoDependencia('2027-01-31', null, false, '2026-11-18')).toBe('sem_data');
    expect(situacaoDependencia('2026-11-01', '2026-12-10', false, '2026-11-18')).toBe('atrasada');
    expect(situacaoDependencia('2026-11-01', '2026-12-10', true, '2026-11-18')).toBe('entregue');
  });
});

describe('encerramento', () => {
  it('balanço de prazo, custo e escopo', () => {
    expect(balancoPrazo(null)).toBe('neutro');
    expect(balancoPrazo(0)).toBe('ok');
    expect(balancoPrazo(1)).toBe('aten');
    expect(balancoPrazo(3)).toBe('crit');
    expect(balancoCusto(100, 95)).toBe('ok');
    expect(balancoCusto(100, 105)).toBe('aten');
    expect(balancoCusto(100, 120)).toBe('crit');
    expect(balancoCusto(0, 50)).toBe('neutro');
    expect(balancoEscopo(1)).toBe('ok');
    expect(balancoEscopo(2)).toBe('aten');
  });
  it('valida a lição', () => {
    expect(validarLicao({ tipo: 'funcionou', texto: 'Reunião semanal com o fornecedor evitou atrasos' })).toBeNull();
    expect(validarLicao({ tipo: 'outro', texto: 'Reunião semanal com o fornecedor' })).toMatch(/funcionou/);
    expect(validarLicao({ tipo: 'melhorar', texto: 'curto' })).toMatch(/frase/);
  });
});

describe('muro: prazos e atrasos', () => {
  it('dias da semana', () => {
    expect(diaDaSemana('2026-11-20')).toBe(5); // sexta
    expect(diaDaSemana('2026-11-22')).toBe(7); // domingo
    expect(proximoDiaSemana('2026-11-18', 5)).toBe('2026-11-20');
    expect(proximoDiaSemana('2026-11-20', 5)).toBe('2026-11-20');
  });
  it('próximo status devido pela cadência', () => {
    expect(proximoStatusDevido('2026-11-13', 'semanal', 5, true)).toBe('2026-11-20'); // publicou sexta → próxima sexta
    expect(proximoStatusDevido('2026-11-13', 'quinzenal', 5, true)).toBe('2026-11-27');
    expect(proximoStatusDevido('2026-11-13', 'mensal', 5, true)).toBe('2026-12-11');
    expect(proximoStatusDevido('2026-11-16', 'semanal', 5, false)).toBe('2026-11-27'); // play na segunda: 1º status na sexta da semana seguinte
  });
  it('atraso, negociação e validação do pedido de prazo', () => {
    expect(diasDeAtraso('2026-11-20', '2026-11-20')).toBe(0);
    expect(diasDeAtraso('2026-11-20', '2026-11-23')).toBe(3);
    expect(emNegociacao([{ tipo: 'tarefa', alvoId: 'x', status: 'pendente' }], 'tarefa', 'x')).toBe(true);
    expect(emNegociacao([{ tipo: 'tarefa', alvoId: 'x', status: 'recusado' }], 'tarefa', 'x')).toBe(false);
    expect(validarPedidoPrazo({ novoPrazo: '2026-12-01', motivo: 'Fornecedor atrasou a entrega' }, '2026-11-20', '2026-11-18')).toBeNull();
    expect(validarPedidoPrazo({ novoPrazo: '2026-11-10', motivo: 'Fornecedor atrasou' }, '2026-11-20', '2026-11-18')).toMatch(/passado/);
    expect(validarPedidoPrazo({ novoPrazo: '2026-11-19', motivo: 'Fornecedor atrasou' }, '2026-11-20', '2026-11-18')).toMatch(/depois do atual/);
    expect(validarPedidoPrazo({ novoPrazo: '2026-12-01', motivo: 'x' }, null, '2026-11-18')).toMatch(/Explique/);
  });
});

describe('pessoas', () => {
  const areas = [
    { id: 'ops', parentId: null, nome: 'Diretoria de Operações', responsavelId: 'ricardo' },
    { id: 'log', parentId: 'ops', nome: 'Logística', responsavelId: 'fernanda' },
    { id: 'exp', parentId: 'log', nome: 'Expedição', responsavelId: 'clara' },
  ];
  const p = (id: string, areaId: string) => ({ id, areaId, nome: id, cedeAte: 20, externo: false });
  const pessoas = [p('ricardo', 'ops'), p('fernanda', 'log'), p('joao', 'log'), p('clara', 'exp'), p('diego', 'exp')];
  it('gestor vem da área; responsável sobe para a área-mãe', () => {
    expect(gestorDe(pessoas[2], areas)).toBe('fernanda');
    expect(gestorDe(pessoas[1], areas)).toBe('ricardo');
    expect(gestorDe(pessoas[0], areas)).toBeNull();
  });
  it('time direto inclui responsáveis das subáreas', () => {
    expect(timeDireto('fernanda', pessoas, areas).map((x) => x.id).sort()).toEqual(['clara', 'joao']);
  });
  it('áreas sob gestão incluem subáreas', () => {
    expect(areasSobGestao('fernanda', areas).sort()).toEqual(['exp', 'log']);
  });
  it('rótulos e capacidade', () => {
    expect(nomeCurto('Luiza Prado')).toBe('Luiza P.');
    expect(acimaDoCedido(30, 20)).toBe(true);
    expect(acimaDoCedido(100, null, true)).toBe(false);
  });
});

describe('datas', () => {
  it('aritmética e formatos', () => {
    expect(addDias('2026-10-17', 3)).toBe('2026-10-20');
    expect(diffDias('2026-10-17', '2026-10-12')).toBe(5);
    expect(dataPorExtenso('2026-10-17')).toBe('Sábado, 17 de outubro');
    expect(haQuanto('2026-10-16', '2026-10-17')).toBe('ontem');
    expect(proximaSexta('2026-10-17')).toBe('2026-10-23');
  });
});

describe('impacto de ceder uma pessoa', () => {
  const meses = [{ de: '2026-11-01', ate: '2026-12-01' }, { de: '2026-12-01', ate: '2027-01-01' }, { de: '2027-01-01', ate: '2027-02-01' }];
  const outro = { ini: '2026-10-01', fim: '2027-02-01', pct: 20 };
  const proj = [{ ini: '2026-12-01', fim: '2026-12-20', pct: 40 }, { ini: '2027-01-01', fim: '2027-02-01', pct: 70 }];
  it('mostra carga, parte do projeto e se cabe no limite', () => {
    const r = impactoPorMes([outro, ...proj], proj, meses, 50, 70);
    expect(r.map((x) => x.carga)).toEqual([20, 60, 90]);
    expect(r.map((x) => x.doProjeto)).toEqual([0, 40, 70]);
    expect(r.map((x) => x.situacao)).toEqual(['ok', 'so_com_pedido', 'acima']);
  });
});

describe('gestor: não seguir com a iniciativa', () => {
  const motivos = ['Sem orçamento no ciclo', 'Fora da estratégia atual'];
  it('exige motivo da lista e comentário', () => {
    expect(validarNaoSeguir('', 'Já coberto por outro projeto', motivos)).toMatch(/motivo/);
    expect(validarNaoSeguir('Outro', 'Já coberto por outro projeto', motivos)).toMatch(/motivo/);
    expect(validarNaoSeguir('Fora da estratégia atual', '  ok ', motivos)).toMatch(/Explique/);
    expect(validarNaoSeguir('Fora da estratégia atual', 'Já coberto por outro projeto', motivos)).toBeNull();
  });
});

describe('gestor: prioridade da área', () => {
  it('ordenadas primeiro, depois as sem ordem pelas mais antigas', () => {
    const x = (id: string, p: number | null, dia: string) => ({ id, prioridadeArea: p, enviadaEm: new Date(dia) });
    const r = ordenarPrioridadeArea([x('a', null, '2026-10-02'), x('b', 2, '2026-10-01'), x('c', null, '2026-09-01'), x('d', 1, '2026-10-05')]);
    expect(r.map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });
});

describe('gestor: prazo para decidir', () => {
  it('5 dias corridos depois de chegar, ou o prazo pedido', () => {
    expect(prazoDecisao('2026-10-12')).toBe('2026-10-17');
    expect(prazoDecisao('2026-10-12', '2026-10-14')).toBe('2026-10-14');
  });
});

describe('ausências do time', () => {
  const ferias = [{ inicio: '2026-12-01', fim: '2026-12-15' }, { inicio: '2026-12-10', fim: '2026-12-20' }];
  it('conta dias dentro do mês sem duplicar sobreposição', () => {
    expect(diasAusente(ferias, '2026-12-01', '2027-01-01')).toBe(20);
    expect(diasAusente(ferias, '2026-11-01', '2026-12-01')).toBe(0);
    expect(fracaoAusente([{ inicio: '2026-11-01', fim: '2026-11-30' }], '2026-11-01', '2026-12-01')).toBe(1);
  });
  it('cruza com uma fase', () => {
    expect(cruza(ferias[0], '2026-10-26', '2026-12-21')).toBe(true);
    expect(cruza(ferias[0], '2026-12-16', '2027-01-01')).toBe(false);
  });
  it('valida', () => {
    expect(validarAusencia({ inicio: '2026-12-10', fim: '2026-12-01', motivo: 'Férias' }, '2026-11-18')).toMatch(/fim/);
    expect(validarAusencia({ inicio: '2026-10-01', fim: '2026-10-10', motivo: 'Férias' }, '2026-11-18')).toMatch(/terminou/);
    expect(validarAusencia({ inicio: '2026-12-01', fim: '2026-12-10', motivo: 'X' }, '2026-11-18')).toMatch(/motivo/);
    expect(validarAusencia({ inicio: '2026-12-01', fim: '2026-12-10', motivo: 'Férias' }, '2026-11-18')).toBeNull();
  });
});

describe('substituto do gestor', () => {
  const dl = [{ gestorId: 'fer', substitutoId: 'mar', inicio: '2026-12-01', fim: '2026-12-15' }];
  it('vale só no período', () => {
    expect(substitutoAtivo(dl, 'fer', '2026-11-30')).toBeNull();
    expect(quemDecide(dl, 'fer', '2026-12-01')).toBe('mar');
    expect(quemDecide(dl, 'fer', '2026-12-16')).toBe('fer');
  });
  it('quem responde por quem', () => {
    expect(gestoresRepresentados(dl, 'mar', '2026-12-05')).toEqual(['mar', 'fer']);
    expect(gestoresRepresentados(dl, 'fer', '2026-12-05')).toEqual(['fer']);
    expect(gestoresRepresentados(dl, 'fer', '2026-12-20')).toEqual(['fer']);
  });
  it('valida', () => {
    const ok = () => true;
    expect(validarDelegacao({ substitutoId: 'fer', inicio: '2026-12-01', fim: '2026-12-02' }, 'fer', '2026-11-18', ok)).toMatch(/outra pessoa/);
    expect(validarDelegacao({ substitutoId: 'mar', inicio: '2026-12-01', fim: '2026-12-02' }, 'fer', '2026-11-18', () => false)).toMatch(/perfil de gestor/);
    expect(validarDelegacao({ substitutoId: 'mar', inicio: '2026-12-05', fim: '2026-12-02' }, 'fer', '2026-11-18', ok)).toMatch(/fim/);
    expect(validarDelegacao({ substitutoId: 'mar', inicio: '2026-12-01', fim: '2026-12-02' }, 'fer', '2026-11-18', ok)).toBeNull();
  });
});

describe('feedback do GP sobre quem foi cedido', () => {
  it('abaixo do esperado exige comentário', () => {
    expect(validarFeedback('x', '')).toMatch(/Escolha/);
    expect(validarFeedback('abaixo', 'curto')).toMatch(/faltou/);
    expect(validarFeedback('abaixo', 'Entregou os testes com atraso')).toBeNull();
    expect(validarFeedback('superou', '')).toBeNull();
  });
  it('pendente quando a participação terminou e não há feedback', () => {
    expect(feedbackPendente('2026-11-10', '2026-11-18', false)).toBe(true);
    expect(feedbackPendente('2026-11-10', '2026-11-18', true)).toBe(false);
    expect(feedbackPendente('2026-12-10', '2026-11-18', false)).toBe(false);
  });
});

describe('status a publicar na Início do GP (cadência)', () => {
  it('atrasado quando o dia combinado passou; a vencer nos próximos 7 dias; senão, nada', () => {
    expect(situacaoStatus('2026-10-16', '2026-10-17')).toBe('atrasado');
    expect(situacaoStatus('2026-10-17', '2026-10-17')).toBe('a_vencer');
    expect(situacaoStatus('2026-10-23', '2026-10-17')).toBe('a_vencer');
    expect(situacaoStatus('2026-10-30', '2026-10-17')).toBeNull(); // mensal/quinzenal: ainda não é hora
  });
  it('mensal publicado há uma semana não cobra status nesta semana', () => {
    const prox = proximoStatusDevido('2026-10-09', 'mensal', 5, true);
    expect(prox).toBe('2026-11-06');
    expect(situacaoStatus(prox, '2026-10-17')).toBeNull();
  });
  it('rótulo do vencimento', () => {
    expect(rotuloVencimentoStatus('2026-10-17', '2026-10-17')).toBe('vence hoje');
    expect(rotuloVencimentoStatus('2026-10-23', '2026-10-17')).toBe('vence sexta, 23/10');
    expect(rotuloVencimentoStatus('2026-10-16', '2026-10-17')).toBe('venceu sexta, 16/10 (1 dia de atraso)');
  });
});

describe('editar tarefa', () => {
  const base = { titulo: 'Testar', prazo: '2026-11-20', prazoAtual: '2026-11-10', pedidoPrazoPendente: false };
  it('exige título e prazo válido', () => {
    expect(validarEdicaoTarefa({ ...base, titulo: '  ' })).toBe('Descreva a tarefa.');
    expect(validarEdicaoTarefa({ ...base, prazo: '20/11' })).toBe('Prazo inválido.');
    expect(validarEdicaoTarefa(base)).toBeNull();
    expect(validarEdicaoTarefa({ ...base, prazo: '' })).toBeNull(); // pode ficar sem prazo
  });
  it('com pedido de mais prazo aguardando, o prazo não muda por aqui (o resto pode)', () => {
    expect(validarEdicaoTarefa({ ...base, pedidoPrazoPendente: true })).toMatch(/pedido de mais prazo/);
    expect(validarEdicaoTarefa({ ...base, prazo: '2026-11-10', pedidoPrazoPendente: true })).toBeNull();
  });
});

describe('acesso à página do projeto', () => {
  const ninguem = { ehPmo: false, ehGp: false, participa: false };
  it('GP e PMO editam; quem participa vê em leitura; os demais não acessam', () => {
    expect(modoDoProjeto({ ...ninguem, ehPmo: true })).toBe('edicao');
    expect(modoDoProjeto({ ...ninguem, ehGp: true, participa: true })).toBe('edicao');
    expect(modoDoProjeto({ ...ninguem, participa: true })).toBe('leitura');
    expect(modoDoProjeto(ninguem)).toBeNull();
  });
  it('quem pediu a iniciativa acompanha o projeto em leitura', () => {
    expect(modoDoProjeto({ ...ninguem, solicitante: true })).toBe('leitura');
  });
  it('o patrocinador acompanha o projeto em leitura', () => {
    expect(modoDoProjeto({ ...ninguem, patrocinador: true })).toBe('leitura');
  });
});

describe('retirar uma iniciativa (quem pediu)', () => {
  it('rascunho é excluído; devolvida ou com o gestor vai para Cancelados; depois do gestor, não', () => {
    expect(retiradaPermitida('sol', 'rascunho')).toBe('excluir');
    expect(retiradaPermitida('sol', 'devolvida')).toBe('cancelar');
    expect(retiradaPermitida('sol', 'aguardando_gestor')).toBe('cancelar');
    expect(retiradaPermitida('sol', 'aguardando_pmo')).toBeNull();
    expect(retiradaPermitida('bkl', null)).toBeNull();
    expect(retiradaPermitida('exe', null)).toBeNull();
  });
  it('retirar exige um comentário curto; excluir rascunho não', () => {
    expect(validarRetirada('cancelar', 'ok')).toMatch(/poucas palavras/);
    expect(validarRetirada('cancelar', 'Já resolvido pelo TI')).toBeNull();
    expect(validarRetirada('excluir', '')).toBeNull();
  });
});

describe('patrocinador', () => {
  it('só pessoas internas com o perfil Patrocinador', () => {
    expect(patrocinadorValido({ externo: false, perfis: ['gestor', 'patrocinador'] })).toBe(true);
    expect(patrocinadorValido({ externo: false, perfis: ['gestor'] })).toBe(false);
    expect(patrocinadorValido({ externo: true, perfis: ['patrocinador'] })).toBe(false);
    expect(patrocinadorValido(undefined)).toBe(false);
  });
});
