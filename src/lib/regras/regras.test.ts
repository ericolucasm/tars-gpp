import { describe, it, expect } from 'vitest';
import { notaFinal, custoReferencia, ordenarPorNota, podeComunicar } from './avaliacao';
import { acoesDoCard, validarGate, podeConfirmar, type Raia } from './esteira';
import { desvio, farolSugerido, statusDaFase, fasesDoModelo, mesesDaLinha, descreverMudanca, progresso } from './projeto';
import { gestorDe, timeDireto, areasSobGestao, nomeCurto, acimaDoCedido } from './pessoas';
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
