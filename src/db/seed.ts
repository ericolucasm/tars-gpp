import { addDias, diffDias } from '@/lib/regras/datas';
import type { DB } from './index';
import * as t from './schema';

// Empresa demo "Acme", com os dados do protótipo.
// O protótipo foi desenhado no dia 17/10/2026: todas as datas são deslocadas em semanas inteiras
// para que a demo esteja sempre "atual" (mantendo os dias da semana).
const DATA_PROTOTIPO = '2026-10-17';

export async function seedDemo(db: DB, hoje: string) {
  const shift = Math.floor(diffDias(hoje, DATA_PROTOTIPO) / 7) * 7;
  const d = (iso: string) => addDias(iso, shift);
  const ts = (iso: string) => new Date(`${d(iso)}T12:00:00-03:00`);

  return db.transaction(async (tx) => {
    const [org] = await tx.insert(t.orgs).values({
      nome: 'Acme',
      modoCaptacao: 'misto',
      config: {
        pesos: [35, 25, 25, 15],
        motivos: {
          recusa: ['Sem orçamento no ciclo', 'Sobreposição com outra iniciativa', 'Benefício não demonstrado', 'Fora da estratégia atual'],
          pausa: ['Aguardando orçamento', 'Recurso realocado para prioridade maior', 'Dependência de fornecedor', 'Decisão da diretoria'],
          cancelamento: ['Problema deixou de existir', 'Substituído por outra solução', 'Custo acima do benefício', 'Mudança de estratégia'],
        },
      },
    }).returning();
    const orgId = org.id;

    // ---------- Áreas ----------
    type A = { nome: string; tipo: string; pai?: string; resp: string; hc: number };
    const AREAS: A[] = [
      { nome: 'Diretoria de Operações', tipo: 'Diretoria', resp: 'Ricardo Moura', hc: 42 },
      { nome: 'Logística', tipo: 'Gerência', pai: 'Diretoria de Operações', resp: 'Fernanda Oliveira', hc: 18 },
      { nome: 'Expedição', tipo: 'Coordenação', pai: 'Logística', resp: 'Clara Mendes', hc: 9 },
      { nome: 'Armazém', tipo: 'Coordenação', pai: 'Logística', resp: 'Bruno Reis', hc: 7 },
      { nome: 'Operações industriais', tipo: 'Gerência', pai: 'Diretoria de Operações', resp: 'Marcos Rocha', hc: 16 },
      { nome: 'Qualidade', tipo: 'Gerência', pai: 'Diretoria de Operações', resp: 'Júlia Tavares', hc: 8 },
      { nome: 'Diretoria Comercial', tipo: 'Diretoria', resp: 'Paula Ribeiro', hc: 21 },
      { nome: 'Vendas', tipo: 'Gerência', pai: 'Diretoria Comercial', resp: 'Sérgio Lima', hc: 14 },
      { nome: 'Marketing', tipo: 'Gerência', pai: 'Diretoria Comercial', resp: 'Luiza Prado', hc: 6 },
      { nome: 'Atendimento', tipo: 'Gerência', pai: 'Diretoria Comercial', resp: 'Luiza Prado', hc: 5 },
      { nome: 'Diretoria Administrativa', tipo: 'Diretoria', resp: 'Helena Castro', hc: 19 },
      { nome: 'Financeiro', tipo: 'Gerência', pai: 'Diretoria Administrativa', resp: 'Camila Alves', hc: 6 },
      { nome: 'RH', tipo: 'Gerência', pai: 'Diretoria Administrativa', resp: 'Renata Silva', hc: 4 },
      { nome: 'TI', tipo: 'Gerência', pai: 'Diretoria Administrativa', resp: 'Marcos Teixeira', hc: 5 },
      { nome: 'Compras', tipo: 'Gerência', pai: 'Diretoria Administrativa', resp: 'Tiago Moraes', hc: 3 },
      { nome: 'PMO', tipo: 'Gerência', pai: 'Diretoria Administrativa', resp: 'Mariana', hc: 2 },
    ];
    const area: Record<string, string> = {};
    for (const [i, a] of AREAS.entries()) {
      const [row] = await tx.insert(t.areas).values({ orgId, nome: a.nome, tipo: a.tipo, parentId: a.pai ? area[a.pai] : null, headcount: a.hc, ordem: i }).returning();
      area[a.nome] = row.id;
    }

    // ---------- Pessoas (a ordem define a persona padrão do "ver como") ----------
    type P = { nome: string; email?: string; area?: string; cargo?: string; perfis: string[]; admin?: boolean; cede?: number | null; trat: 'f' | 'm' | 'n'; status?: string; externo?: boolean };
    const PESSOAS: P[] = [
      { nome: 'Mariana', area: 'PMO', cargo: 'PMO', perfis: ['pmo'], admin: true, cede: null, trat: 'f' },
      { nome: 'Fernanda Oliveira', area: 'Logística', cargo: 'Gerente de logística', perfis: ['gestor'], cede: 20, trat: 'f' },
      { nome: 'Carlos Andrade', area: 'Vendas', cargo: 'Gerente de projeto', perfis: ['gp'], cede: 50, trat: 'm' },
      { nome: 'João Silva', area: 'Logística', cargo: 'Assistente de logística', perfis: ['colaborador'], cede: 20, trat: 'm' },
      { nome: 'Clara Mendes', area: 'Expedição', cargo: 'Supervisora de expedição', perfis: ['gestor', 'colaborador'], cede: 20, trat: 'f' },
      { nome: 'Bruno Reis', area: 'Armazém', cargo: 'Analista de logística', perfis: ['colaborador'], cede: 30, trat: 'm' },
      { nome: 'Diego Santos', area: 'Logística', cargo: 'Operador líder', perfis: ['colaborador'], cede: 10, trat: 'm' },
      { nome: 'Pedro Lima', area: 'TI', cargo: 'Desenvolvedor', perfis: ['colaborador'], cede: 60, trat: 'm' },
      { nome: 'Renata Souza', area: 'Vendas', cargo: 'Analista de negócios', perfis: ['colaborador'], cede: 50, trat: 'f' },
      { nome: 'Ana Costa', area: 'Marketing', cargo: 'Designer', perfis: ['colaborador'], cede: 30, trat: 'f' },
      { nome: 'Paula Ribeiro', area: 'Diretoria Comercial', cargo: 'Diretora comercial', perfis: ['gestor', 'patrocinador'], cede: 10, trat: 'f' },
      { nome: 'Tiago Moraes', area: 'Compras', cargo: 'Gerente de compras', perfis: ['gestor'], cede: 20, trat: 'm', status: 'convite' },
      { nome: 'Ricardo Moura', area: 'Diretoria de Operações', cargo: 'Diretor de operações', perfis: ['gestor', 'patrocinador'], cede: 10, trat: 'm' },
      { nome: 'Helena Castro', area: 'Diretoria Administrativa', cargo: 'Diretora administrativa', perfis: ['gestor', 'patrocinador'], cede: 10, trat: 'f' },
      { nome: 'Marcos Teixeira', area: 'TI', cargo: 'Gerente de TI', perfis: ['gestor'], cede: 20, trat: 'm' },
      { nome: 'Sérgio Lima', area: 'Vendas', cargo: 'Gerente de vendas', perfis: ['gestor'], cede: 20, trat: 'm' },
      { nome: 'Luiza Prado', area: 'Marketing', cargo: 'Gerente de marketing', perfis: ['gestor', 'colaborador'], cede: 20, trat: 'f' },
      { nome: 'Marcos Rocha', area: 'Operações industriais', cargo: 'Gerente industrial', perfis: ['gestor', 'gp'], cede: 30, trat: 'm' },
      { nome: 'Júlia Tavares', area: 'Qualidade', cargo: 'Gerente da qualidade', perfis: ['gestor', 'gp'], cede: 30, trat: 'f' },
      { nome: 'Camila Alves', area: 'Financeiro', cargo: 'Gerente financeira', perfis: ['gestor'], cede: 20, trat: 'f' },
      { nome: 'Renata Silva', area: 'RH', cargo: 'Gerente de RH', perfis: ['gestor'], cede: 20, trat: 'f' },
      { nome: 'Fábio Oliveira', area: 'Logística', cargo: 'Gerente de projeto', perfis: ['gp'], cede: 50, trat: 'm' },
      { nome: 'Marina Gomes', area: 'Vendas', cargo: 'Gerente de projeto', perfis: ['gp'], cede: 50, trat: 'f' },
      { nome: 'DevHouse', email: 'contato@devhouse.com.br', cargo: 'Fornecedor externo', perfis: [], cede: null, trat: 'n', externo: true },
    ];
    const pes: Record<string, string> = {};
    const emailDe = (nome: string) => `${nome.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}${nome.split(' ').length > 1 ? '.' + nome.split(' ').slice(-1)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''}@acme.com.br`;
    for (const p of PESSOAS) {
      const [row] = await tx.insert(t.pessoas).values({
        orgId, nome: p.nome, email: p.email ?? emailDe(p.nome), areaId: p.area ? area[p.area] : null, cargo: p.cargo,
        perfis: p.perfis, admin: !!p.admin, cedeAte: p.cede ?? null, tratamento: p.trat, status: p.status ?? 'ativo', externo: !!p.externo,
      }).returning();
      pes[p.nome] = row.id;
    }
    for (const a of AREAS) {
      const { eq } = await import('drizzle-orm');
      await tx.update(t.areas).set({ responsavelId: pes[a.resp] }).where(eq(t.areas.id, area[a.nome]));
    }

    // ---------- Raias ----------
    const c = (texto: string, obrigatorio = true) => ({ texto, obrigatorio });
    const RAIAS = [
      { chave: 'sol', nome: 'Solicitações', descricao: 'Em aprovação pelo gestor e PMO', aprovador: 'Gestor da área solicitante', tipoCard: 'Iniciativa',
        criterios: [c('Alinhada às prioridades da área'), c('Informações suficientes para avaliação')],
        gateTitulo: 'Aprovar como gestor', gateDica: 'Como gestor da área, você confirma que a iniciativa faz sentido antes de o PMO avaliar.', gateConfirmar: 'Aprovar e enviar ao PMO', acaoRotulo: 'Aprovar' },
      { chave: 'bkl', nome: 'Backlog', descricao: 'Classificadas, aguardando prioridade', aprovador: 'PMO', tipoCard: 'Iniciativa',
        criterios: [c('Tipo de iniciativa definido'), c('Prioridade definida'), c('Esforço estimado'), c('Patrocinador indicado')],
        gateTitulo: 'Classificar iniciativa', gateDica: 'Para entrar no backlog, a solicitação precisa estar classificada.', gateConfirmar: 'Mover para backlog', acaoRotulo: 'Classificar' },
      { chave: 'pre', nome: 'Pré-projeto', descricao: 'Aprovadas, preparando o play', aprovador: 'PMO', tipoCard: 'Iniciativa',
        criterios: [c('Aprovação do gestor do portfólio'), c('Área solicitante comunicada')],
        gateTitulo: 'Pré-aprovar iniciativa', gateDica: 'A área recebe o ok e passa a complementar as informações do pré-projeto.', gateConfirmar: 'Pré-aprovar', acaoRotulo: 'Pré-aprovar' },
      { chave: 'exe', nome: 'Em execução', descricao: 'Cronograma rodando', aprovador: 'PMO', tipoCard: 'Projeto',
        criterios: [c('Informações complementadas pela área'), c('Gerente de projeto atribuído'), c('Time engajado e alocado'), c('Contratos com terceiros resolvidos (se houver)'), c('Datas de início e fim definidas')],
        gateTitulo: 'Dar play no cronograma', gateDica: 'O cronograma só começa quando o pré-projeto está pronto.', gateConfirmar: 'Dar play', acaoRotulo: 'Dar play' },
      { chave: 'pau', nome: 'Pausado', descricao: 'Parado por decisão', aprovador: 'PMO', tipoCard: 'Projeto',
        criterios: [c('Motivo da pausa registrado'), c('Data prevista de retomada definida')],
        gateTitulo: 'Pausar projeto', gateDica: 'Pausar é uma decisão formal: o relógio do projeto para.', gateConfirmar: 'Pausar', acaoRotulo: 'Pausar',
        criteriosRetomada: [c('Pendência resolvida'), c('Cronograma replanejado')] },
      { chave: 'con', nome: 'Concluído', descricao: 'Entregue e aceito', aprovador: 'Gerente de projeto', tipoCard: 'Projeto',
        criterios: [c('Aceite da entrega pelo solicitante'), c('Lições aprendidas registradas', false)],
        gateTitulo: 'Concluir projeto', gateDica: 'A entrega precisa de aceite de quem pediu.', gateConfirmar: 'Concluir', acaoRotulo: 'Concluir' },
      { chave: 'can', nome: 'Cancelado / recusado', descricao: 'Saiu da esteira', aprovador: 'PMO', tipoCard: 'Iniciativa', saida: true,
        criterios: [c('Motivo registrado'), c('Solicitante comunicado')],
        gateTitulo: 'Cancelar ou recusar', gateDica: 'Toda saída da esteira precisa de um motivo, para o portfólio contar a história real.', gateConfirmar: 'Cancelar iniciativa', acaoRotulo: 'Cancelar' },
    ];
    const raia: Record<string, string> = {};
    for (const [i, r] of RAIAS.entries()) {
      const [row] = await tx.insert(t.raias).values({ orgId, ordem: (i + 1) * 10, saida: false, ...r }).returning();
      raia[r.chave] = row.id;
    }

    // ---------- Fases e modelos ----------
    const FASES: [string, number, string][] = [
      ['Iniciação', 2, 'Termo de abertura aprovado pelo patrocinador'],
      ['Levantamento de requisitos', 2, 'Requisitos validados pela área solicitante'],
      ['Planejamento', 3, 'Cronograma, equipe e riscos aprovados; linha de base congelada'],
      ['Contratação de fornecedor', 3, 'Contrato assinado'],
      ['Execução', 8, 'Entregas do escopo concluídas'],
      ['Desenvolvimento', 10, 'Funcionalidades prontas para teste'],
      ['Testes', 4, 'Aceite dos testes pela área'],
      ['Piloto', 2, 'Piloto avaliado e ajustes definidos'],
      ['Treinamento', 2, 'Usuários-chave treinados'],
      ['Implantação', 2, 'Solução em uso pela área'],
      ['Operação assistida', 3, 'Operação estável sem apoio do projeto'],
      ['Encerramento', 1, 'Aceite final e lições aprendidas registradas'],
    ];
    const fase: Record<string, { id: string; dur: number; crit: string }> = {};
    for (const [i, [nome, dur, crit]] of FASES.entries()) {
      const [row] = await tx.insert(t.fasesBiblioteca).values({ orgId, nome, duracaoSemanas: dur, criterioConclusao: crit, ordem: i }).returning();
      fase[nome] = { id: row.id, dur, crit };
    }
    const MODELOS: [string, string, string[]][] = [
      ['Projeto de melhoria', 'Para melhorias de processo sem fornecedor externo.', ['Iniciação', 'Planejamento', 'Execução', 'Encerramento']],
      ['Software com fornecedor', 'Desenvolvimento contratado de um sistema ou aplicativo.', ['Iniciação', 'Planejamento', 'Contratação de fornecedor', 'Desenvolvimento', 'Testes', 'Implantação', 'Encerramento']],
      ['Implantação de sistema', 'Adoção de um sistema pronto (ERP, CRM, ponto).', ['Iniciação', 'Levantamento de requisitos', 'Planejamento', 'Implantação', 'Treinamento', 'Operação assistida', 'Encerramento']],
      ['Obra ou infraestrutura', 'Reformas, layout, equipamentos.', ['Iniciação', 'Planejamento', 'Contratação de fornecedor', 'Execução', 'Encerramento']],
    ];
    const modelo: Record<string, string> = {};
    for (const [nome, descricao, fs] of MODELOS) {
      const [row] = await tx.insert(t.modelos).values({ orgId, nome, descricao, fases: fs.map((f) => fase[f].id) }).returning();
      modelo[nome] = row.id;
    }

    // ---------- Ciclos ----------
    const [c2027] = await tx.insert(t.ciclos).values({
      orgId, nome: 'Planejamento 2027', ano: 2027, descricao: 'Iniciativas para executar a partir de janeiro de 2027',
      abertura: d('2026-09-01'), fechamento: d('2026-10-31'), avaliacaoAte: d('2026-11-20'), comunicarAte: d('2026-12-04'), playAPartir: 'a partir de jan.',
      orcamentoRef: 1200000, etapa: 'inscricoes',
    }).returning();
    const [c2026] = await tx.insert(t.ciclos).values({
      orgId, nome: 'Planejamento 2026', ano: 2026, descricao: 'Iniciativas para executar a partir de janeiro de 2026',
      abertura: d('2025-09-01'), fechamento: d('2025-10-31'), avaliacaoAte: d('2025-11-20'), comunicarAte: d('2025-12-04'), playAPartir: 'a partir de jan.',
      orcamentoRef: 1100000, etapa: 'encerrado', comunicadoEm: d('2025-12-05'),
      snapshot: { recebidas: 24, preAprovadas: 11, viraramProjeto: 9, backlog: 5, recusadas: 8, comprometido: 1045000,
        motivosRecusa: [['Sem orçamento no ciclo', 4], ['Sobreposição com outra iniciativa', 2], ['Benefício não demonstrado', 2]] },
    }).returning();
    await tx.insert(t.ciclos).values({
      orgId, nome: 'Planejamento 2025', ano: 2025, descricao: 'Iniciativas para executar a partir de janeiro de 2025',
      abertura: d('2024-09-02'), fechamento: d('2024-10-31'), avaliacaoAte: d('2024-11-20'), comunicarAte: d('2024-12-04'), playAPartir: 'a partir de jan.',
      orcamentoRef: 900000, etapa: 'encerrado', comunicadoEm: d('2024-12-06'),
      snapshot: { recebidas: 18, viraramProjeto: 7, concluidos: 6, cancelados: 1, realizado: 790000, entreguesNoPrazo: '4 de 6', desvioMedio: '+3 semanas' },
    });

    // ---------- Iniciativas ----------
    type I = Partial<typeof t.iniciativas.$inferInsert> & { titulo: string; tipo: string; sol: string; raia: string; area: string };
    const ini: Record<string, string> = {};
    const add = async (x: I) => {
      const { sol, raia: rk, area: an, ...rest } = x;
      const [row] = await tx.insert(t.iniciativas).values({ orgId, solicitanteId: pes[sol], areaId: area[an], raiaId: raia[rk], ...rest }).returning();
      ini[x.titulo] = row.id;
      return row.id;
    };
    const imp = (...nomes: string[]) => nomes.map((n) => area[n]);

    // Solicitações aguardando gestor
    await add({ titulo: 'Novo site institucional', tipo: 'est', sol: 'Luiza Prado', area: 'Marketing', raia: 'sol', solStatus: 'aguardando_gestor', aprovadorId: pes['Paula Ribeiro'],
      problema: 'O site atual não gera contatos comerciais e não funciona bem no celular.', faixaCusto: 'R$ 10–50 mil', custoEstimado: 40000, urgencia: 'esp', cicloId: c2027.id,
      areasImpactadas: imp('Vendas', 'TI'), enviadaEm: ts('2026-10-15') });
    await add({ titulo: 'Reduzir o tempo de separação de pedidos', tipo: 'mel', sol: 'João Silva', area: 'Logística', raia: 'sol', solStatus: 'aguardando_gestor', aprovadorId: pes['Fernanda Oliveira'],
      problema: 'A separação de um pedido leva em média 40 minutos e gera atrasos nas entregas da tarde.', resultadoEsperado: 'Separar um pedido em até 15 minutos.',
      faixaCusto: 'R$ 10–50 mil', custoEstimado: 30000, urgencia: 'esp', cicloId: c2027.id, enviadaEm: ts('2026-10-17') });
    await add({ titulo: 'Etiquetagem automática na expedição', tipo: 'mel', sol: 'Bruno Reis', area: 'Armazém', raia: 'sol', solStatus: 'aguardando_gestor', aprovadorId: pes['Fernanda Oliveira'],
      problema: 'Etiquetas manuais geram erros de endereço em cerca de 1 a cada 50 envios.', faixaCusto: 'R$ 50–200 mil', custoEstimado: 120000, urgencia: 'ano', cicloId: c2027.id,
      areasImpactadas: imp('TI'), enviadaEm: ts('2026-10-14') });
    await add({ titulo: 'Adequação das empilhadeiras à norma de segurança', tipo: 'obr', sol: 'Clara Mendes', area: 'Expedição', raia: 'sol', solStatus: 'aguardando_gestor', aprovadorId: pes['Fernanda Oliveira'],
      problema: 'Auditoria apontou itens obrigatórios pendentes com prazo legal em março.', faixaCusto: 'Até R$ 10 mil', custoEstimado: 6000, urgencia: 'urg',
      justificativaUrgencia: 'Prazo legal em março', cicloId: null, enviadaEm: ts('2026-10-12') });
    await add({ titulo: 'Controle de devoluções no armazém', tipo: 'mel', sol: 'João Silva', area: 'Logística', raia: 'sol', solStatus: 'devolvida', aprovadorId: pes['Fernanda Oliveira'],
      problema: 'Devoluções chegam sem registro e se perdem no armazém.', faixaCusto: 'Não sei', urgencia: 'esp', cicloId: c2027.id,
      devolucaoNota: 'Detalhe o custo estimado e quem mais é impactado.', enviadaEm: ts('2026-10-13'), devolvidaEm: ts('2026-10-16'), devolvidaPorId: pes['Fernanda Oliveira'], devolucaoOrigem: 'gestor' });
    // Solicitações já aprovadas pelo gestor (aguardando PMO)
    await add({ titulo: 'Automatizar controle de ponto', tipo: 'mel', sol: 'Renata Silva', area: 'RH', raia: 'sol', solStatus: 'aguardando_pmo', aprovadorId: pes['Helena Castro'],
      problema: 'O fechamento do ponto é manual e consome 3 dias do RH por mês.', faixaCusto: 'R$ 10–50 mil', custoEstimado: 35000, urgencia: 'esp', cicloId: c2027.id,
      enviadaEm: ts('2026-10-09'), aprovadaGestorEm: ts('2026-10-16'), situacao: null });
    await add({ titulo: 'Adequação à nova norma de segurança', tipo: 'obr', sol: 'Marcos Rocha', area: 'Operações industriais', raia: 'sol', solStatus: 'aguardando_pmo', aprovadorId: pes['Ricardo Moura'],
      problema: 'Nova norma exige adequações na linha de produção.', faixaCusto: 'Até R$ 10 mil', custoEstimado: 8000, urgencia: 'urg', justificativaUrgencia: 'Prazo legal em março',
      cicloId: null, enviadaEm: ts('2026-10-08'), aprovadaGestorEm: ts('2026-10-10') });
    // Backlog
    await add({ titulo: 'Migração do ERP', tipo: 'est', sol: 'Camila Alves', area: 'Financeiro', raia: 'bkl', prioridade: 'Alta', esforco: 'grande', situacao: 'Aguardando priorização',
      problema: 'O ERP atual perde suporte em 2027 e não integra com os sistemas novos.', faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 450000, cicloId: c2027.id,
      areasImpactadas: imp('TI', 'Compras'), enviadaEm: ts('2026-09-10'), aprovadaGestorEm: ts('2026-09-12'), classificadaEm: ts('2026-09-20') });
    await add({ titulo: 'Programa de liderança', tipo: 'est', sol: 'Renata Silva', area: 'RH', raia: 'bkl', prioridade: 'Média', esforco: 'médio', situacao: 'Aguardando próximo ciclo',
      problema: 'Gestores novos não têm formação em gestão de pessoas.', faixaCusto: 'R$ 10–50 mil', custoEstimado: 45000, cicloId: c2027.id,
      enviadaEm: ts('2026-09-15'), aprovadaGestorEm: ts('2026-09-18'), classificadaEm: ts('2026-09-25') });
    await add({ titulo: 'Novo layout do armazém', tipo: 'mel', sol: 'Fernanda Oliveira', area: 'Logística', raia: 'bkl', prioridade: 'Média', esforco: 'médio', situacao: 'Aguardando priorização',
      problema: 'O layout atual gera deslocamentos longos na separação.', faixaCusto: 'R$ 50–200 mil', custoEstimado: 150000, cicloId: c2027.id,
      enviadaEm: ts('2026-09-20'), aprovadaGestorEm: ts('2026-09-22'), classificadaEm: ts('2026-09-30') });
    // Pré-projetos
    const playOk = (n: number) => ({ [raia.exe]: [0, 1, 2, 3, 4].map((i) => i < n) });
    await add({ titulo: 'Reforma do centro de distribuição', tipo: 'est', sol: 'Fernanda Oliveira', area: 'Logística', raia: 'pre', situacao: 'Confirmando recurso interno',
      problema: 'O CD não comporta o volume previsto para 2027.', faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 380000, cicloId: c2026.id, progressoGates: playOk(4),
      enviadaEm: ts('2026-08-20'), aprovadaGestorEm: ts('2026-08-25'), classificadaEm: ts('2026-09-05'), preAprovadaEm: ts('2026-10-01') });
    await add({ titulo: 'Portal do fornecedor', tipo: 'mel', sol: 'Tiago Moraes', area: 'Compras', raia: 'pre', situacao: 'Negociando com fornecedor',
      problema: 'Cotações são trocadas por e-mail e se perdem.', faixaCusto: 'R$ 50–200 mil', custoEstimado: 90000, cicloId: c2026.id, progressoGates: playOk(2),
      enviadaEm: ts('2026-08-28'), aprovadaGestorEm: ts('2026-09-01'), classificadaEm: ts('2026-09-10'), preAprovadaEm: ts('2026-10-05') });

    // Projetos
    const projeto = (x: I & { inicio: string; gp: string; modelo: string; farol: string }) => {
      const { inicio, gp, modelo: m, farol, ...rest } = x;
      return add({ ...rest, gpId: pes[gp], modeloId: modelo[m], inicioProjeto: d(inicio), farol, playEm: ts(inicio), progressoGates: playOk(5) });
    };
    const app = await projeto({ titulo: 'App de pedidos para representantes', tipo: 'est', sol: 'Paula Ribeiro', area: 'Diretoria Comercial', raia: 'exe', inicio: '2026-09-07', gp: 'Carlos Andrade',
      modelo: 'Software com fornecedor', farol: 'aten', patrocinadorId: pes['Paula Ribeiro'], cicloId: c2026.id, faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 280000,
      problema: 'Representantes tiram pedidos em papel e digitam no fim do dia.', areasImpactadas: imp('TI', 'Vendas') });
    const rot = await projeto({ titulo: 'Roteirização de entregas', tipo: 'mel', sol: 'Fernanda Oliveira', area: 'Logística', raia: 'exe', inicio: '2026-08-03', gp: 'Fábio Oliveira',
      modelo: 'Implantação de sistema', farol: 'ok', patrocinadorId: pes['Ricardo Moura'], cicloId: c2026.id, faixaCusto: 'R$ 50–200 mil', custoEstimado: 110000 });
    const inv = await projeto({ titulo: 'Inventário rotativo', tipo: 'mel', sol: 'Fernanda Oliveira', area: 'Logística', raia: 'exe', inicio: '2026-08-24', gp: 'Carlos Andrade',
      modelo: 'Projeto de melhoria', farol: 'aten', patrocinadorId: pes['Ricardo Moura'], cicloId: c2026.id, faixaCusto: 'R$ 10–50 mil', custoEstimado: 25000 });
    const crm = await projeto({ titulo: 'Implantação do CRM', tipo: 'est', sol: 'Sérgio Lima', area: 'Vendas', raia: 'exe', inicio: '2026-06-01', gp: 'Marina Gomes',
      modelo: 'Implantação de sistema', farol: 'ok', patrocinadorId: pes['Paula Ribeiro'], cicloId: c2026.id, faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 210000 });
    const iso = await projeto({ titulo: 'Certificação ISO 9001', tipo: 'obr', sol: 'Júlia Tavares', area: 'Qualidade', raia: 'exe', inicio: '2026-07-20', gp: 'Júlia Tavares',
      modelo: 'Projeto de melhoria', farol: 'aten', patrocinadorId: pes['Ricardo Moura'], cicloId: c2026.id, faixaCusto: 'R$ 50–200 mil', custoEstimado: 70000 });
    const emb = await projeto({ titulo: 'Nova linha de embalagem', tipo: 'est', sol: 'Marcos Rocha', area: 'Operações industriais', raia: 'exe', inicio: '2026-06-15', gp: 'Marcos Rocha',
      modelo: 'Obra ou infraestrutura', farol: 'crit', patrocinadorId: pes['Ricardo Moura'], cicloId: c2026.id, faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 240000 });
    const loja = await projeto({ titulo: 'Loja virtual B2B', tipo: 'est', sol: 'Paula Ribeiro', area: 'Diretoria Comercial', raia: 'pau', inicio: '2026-07-06', gp: 'Marina Gomes',
      modelo: 'Software com fornecedor', farol: 'aten', patrocinadorId: pes['Paula Ribeiro'], cicloId: c2026.id, faixaCusto: 'Acima de R$ 200 mil', custoEstimado: 160000,
      situacao: 'Aguardando orçamento', motivoSaida: 'Aguardando orçamento', retomadaPrevista: d('2027-02-01'), pausadaEm: ts('2026-09-28') });
    const col = await projeto({ titulo: 'Coletores de dados no armazém', tipo: 'mel', sol: 'João Silva', area: 'Logística', raia: 'con', inicio: '2026-03-02', gp: 'Fábio Oliveira',
      modelo: 'Projeto de melhoria', farol: 'ok', cicloId: c2026.id, faixaCusto: 'R$ 10–50 mil', custoEstimado: 32000, concluidaEm: ts('2026-08-15') });
    const cli = await projeto({ titulo: 'Pesquisa de clima 2026', tipo: 'man', sol: 'Renata Silva', area: 'RH', raia: 'con', inicio: '2026-07-06', gp: 'Marina Gomes',
      modelo: 'Projeto de melhoria', farol: 'ok', cicloId: c2026.id, faixaCusto: 'Até R$ 10 mil', custoEstimado: 8000, concluidaEm: ts('2026-09-30') });
    await add({ titulo: 'Chatbot de atendimento', tipo: 'mel', sol: 'Luiza Prado', area: 'Atendimento', raia: 'can', motivoSaida: 'Substituído por outra solução',
      faixaCusto: 'R$ 50–200 mil', cicloId: c2026.id, canceladaEm: ts('2026-08-10') });

    // ---------- Avaliações do ciclo 2027 (notas do protótipo) ----------
    const AV: [string, number[], string | null][] = [
      ['Adequação das empilhadeiras à norma de segurança', [3, 5, 3, 5], 'pre'],
      ['Adequação à nova norma de segurança', [3, 5, 3, 4], 'pre'],
      ['Reduzir o tempo de separação de pedidos', [4, 3, 4, 4], null],
      ['Migração do ERP', [5, 3, 5, 1], null],
      ['Etiquetagem automática na expedição', [3, 3, 3, 3], null],
      ['Novo site institucional', [3, 2, 4, 4], null],
      ['Automatizar controle de ponto', [3, 2, 2, 4], null],
      ['Programa de liderança', [3, 2, 4, 3], null],
      ['Novo layout do armazém', [3, 2, 3, 2], null],
    ];
    for (const [titulo, notas, decisao] of AV) {
      await tx.insert(t.avaliacoes).values({ iniciativaId: ini[titulo], cicloId: c2027.id, orgId, notas, decisao });
    }

    // ---------- Planos dos projetos ----------
    type F = [string, number, number];
    // Fases que terminaram antes da data do protótipo já nascem confirmadas pelo GP
    const plano = async (iniId: string, fases: F[], inicio: string) => {
      const ids: Record<string, string> = {};
      for (const [i, [nome, s, dur]] of fases.entries()) {
        const fim = addDias(inicio, (s + dur) * 7);
        const confirmadaEm = fim < DATA_PROTOTIPO ? ts(fim) : null;
        const [row] = await tx.insert(t.projetoFases).values({ iniciativaId: iniId, nome, inicioSemana: s, duracao: dur, ordem: i, criterioConclusao: fase[nome]?.crit ?? '', confirmadaEm }).returning();
        ids[nome] = row.id;
      }
      return ids;
    };
    const aloc = async (ids: Record<string, string>, lista: [string, string, number][]) => {
      for (const [f, p, pct] of lista) await tx.insert(t.alocacoes).values({ faseId: ids[f], pessoaId: pes[p], pct });
    };
    const tarefas = async (iniId: string, ids: Record<string, string>, lista: [string, string, string, string, boolean][]) => {
      for (const [f, titulo, p, prazo, concluida] of lista) await tx.insert(t.tarefas).values({ iniciativaId: iniId, faseId: ids[f], titulo, responsavelId: pes[p], prazo: d(prazo), concluida });
    };
    const reports = async (iniId: string, lista: [string, string, string, string, string, string][]) => {
      for (const [data, farol, desvio, avancou, aSeguir, atencao] of lista) await tx.insert(t.statusReports).values({ iniciativaId: iniId, data: d(data), farol, desvio, avancou, aSeguir, atencao });
    };

    // App de pedidos — exatamente o plano do protótipo
    const fApp = await plano(app, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Contratação de fornecedor', 3, 3], ['Desenvolvimento', 6, 10], ['Testes', 16, 3], ['Implantação', 19, 2], ['Encerramento', 21, 1]], '2026-09-07');
    await aloc(fApp, [['Iniciação', 'Carlos Andrade', 50], ['Iniciação', 'Renata Souza', 30], ['Planejamento', 'Carlos Andrade', 50], ['Planejamento', 'Renata Souza', 40], ['Planejamento', 'Ana Costa', 30],
      ['Contratação de fornecedor', 'Carlos Andrade', 30], ['Desenvolvimento', 'Carlos Andrade', 30], ['Desenvolvimento', 'Pedro Lima', 80], ['Desenvolvimento', 'DevHouse', 100], ['Desenvolvimento', 'Ana Costa', 20],
      ['Testes', 'Renata Souza', 50], ['Testes', 'Pedro Lima', 40], ['Implantação', 'Pedro Lima', 60], ['Implantação', 'Carlos Andrade', 40], ['Encerramento', 'Carlos Andrade', 20]]);
    await tarefas(app, fApp, [
      ['Iniciação', 'Termo de abertura aprovado', 'Carlos Andrade', '2026-09-18', true], ['Planejamento', 'Cronograma e riscos aprovados', 'Carlos Andrade', '2026-10-02', true],
      ['Planejamento', 'Protótipo aprovado pelos representantes', 'Ana Costa', '2026-10-11', true], ['Contratação de fornecedor', 'Contrato com a DevHouse assinado', 'Carlos Andrade', '2026-10-16', true],
      ['Desenvolvimento', 'Configurar ambiente do fornecedor', 'DevHouse', '2026-10-14', true], ['Desenvolvimento', 'Validar regras de preço com o Comercial', 'Renata Souza', '2026-10-15', false],
      ['Desenvolvimento', 'API de estoque integrada ao ERP', 'Pedro Lima', '2026-10-30', false], ['Desenvolvimento', 'Tela de catálogo de produtos', 'DevHouse', '2026-11-08', false],
      ['Desenvolvimento', 'Fluxo de pedido e aprovação de desconto', 'DevHouse', '2026-11-22', false], ['Testes', 'Roteiro de testes com o Comercial', 'Renata Souza', '2026-12-18', false],
      ['Implantação', 'Treinar representantes', 'Carlos Andrade', '2027-01-15', false], ['Encerramento', 'Lições aprendidas registradas', 'Carlos Andrade', '2027-02-05', false],
    ]);
    for (const [f, nome, data, status] of [['Contratação de fornecedor', 'Contrato assinado', '2026-10-16', 'Atingido'], ['Desenvolvimento', 'API de estoque pronta', '2026-10-30', 'Em risco'],
      ['Testes', 'Primeira versão para testes', '2026-12-18', 'Previsto'], ['Implantação', 'Go-live com representantes', '2027-02-01', 'Previsto']]) {
      await tx.insert(t.marcos).values({ faseId: fApp[f], nome, data: d(data), status });
    }
    for (const [f, nome, nivel] of [['Desenvolvimento', 'Fornecedor atrasar a entrega da API', 'Alto'], ['Desenvolvimento', 'Desenvolvedor dividido com a Implantação do CRM', 'Alto'],
      ['Testes', 'Representantes sem tempo para testar', 'Médio'], ['Implantação', 'Resistência dos representantes ao app', 'Médio']]) {
      await tx.insert(t.riscos).values({ faseId: fApp[f], nome, nivel });
    }
    await reports(app, [
      ['2026-10-10', 'aten', 'Linha de base não congelada', 'Contrato com a DevHouse assinado e protótipo aprovado pelos representantes.', 'Início do desenvolvimento do catálogo e da integração com o ERP.', 'Pedro Lima está alocado acima do cedido pelo gestor de TI.'],
      ['2026-10-03', 'ok', 'Linha de base não congelada', 'Cronograma e riscos aprovados pelo patrocinador.', 'Fechar contrato com o fornecedor.', '—'],
    ]);
    await tx.insert(t.pedidosAlocacao).values({ orgId, iniciativaId: app, pessoaId: pes['Pedro Lima'], deltaPct: 20, aPartirDe: 'outubro', solicitadoPor: pes['Carlos Andrade'], createdAt: ts('2026-10-12') });

    // Roteirização de entregas
    const fRot = await plano(rot, [['Iniciação', 0, 2], ['Levantamento de requisitos', 2, 2], ['Planejamento', 4, 3], ['Implantação', 7, 12], ['Treinamento', 19, 2], ['Operação assistida', 21, 3], ['Encerramento', 24, 1]], '2026-08-03');
    await aloc(fRot, [['Implantação', 'Bruno Reis', 20], ['Implantação', 'João Silva', 10], ['Implantação', 'Fábio Oliveira', 40], ['Treinamento', 'Bruno Reis', 20]]);
    await tarefas(rot, fRot, [
      ['Iniciação', 'Termo de abertura aprovado', 'Fábio Oliveira', '2026-08-14', true], ['Levantamento de requisitos', 'Requisitos de rotas validados', 'Bruno Reis', '2026-08-28', true],
      ['Planejamento', 'Cronograma aprovado', 'Fábio Oliveira', '2026-09-18', true], ['Implantação', 'Cadastrar frota no sistema', 'Bruno Reis', '2026-10-02', true],
      ['Implantação', 'Importar endereços dos clientes', 'Bruno Reis', '2026-10-09', true], ['Implantação', 'Mapear rotas da zona leste', 'João Silva', '2026-10-21', false],
      ['Implantação', 'Testar app de roteirização com 3 motoristas', 'João Silva', '2026-10-23', false], ['Treinamento', 'Treinar motoristas', 'Bruno Reis', '2027-01-08', false],
      ['Encerramento', 'Lições aprendidas registradas', 'Fábio Oliveira', '2027-01-22', false],
    ]);
    await tx.insert(t.linhasBase).values({ iniciativaId: rot, fases: Object.entries(fRot).map(([nome, id]) => ({ id, nome, ...[['Iniciação', 0, 2], ['Levantamento de requisitos', 2, 2], ['Planejamento', 4, 3], ['Implantação', 7, 12], ['Treinamento', 19, 2], ['Operação assistida', 21, 3], ['Encerramento', 24, 1]].filter((x) => x[0] === nome).map((x) => ({ inicioSemana: x[1] as number, duracao: x[2] as number }))[0] })), congeladaEm: ts('2026-09-18') });
    await reports(rot, [['2026-10-16', 'ok', 'No prazo', 'Endereços dos clientes importados.', 'Mapear rotas da zona leste.', '—']]);

    // Inventário rotativo
    const fInv = await plano(inv, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Execução', 5, 8], ['Encerramento', 13, 1]], '2026-08-24');
    await aloc(fInv, [['Execução', 'Clara Mendes', 30], ['Execução', 'Carlos Andrade', 20]]);
    await tarefas(inv, fInv, [
      ['Iniciação', 'Termo de abertura aprovado', 'Carlos Andrade', '2026-09-04', true], ['Planejamento', 'Calendário de contagens aprovado', 'Carlos Andrade', '2026-09-25', true],
      ['Execução', 'Contagem do bloco A', 'Clara Mendes', '2026-10-09', false], ['Execução', 'Contagem do bloco B', 'Clara Mendes', '2026-10-21', false],
      ['Encerramento', 'Lições aprendidas registradas', 'Carlos Andrade', '2026-12-04', false],
    ]);
    await tx.insert(t.marcos).values({ faseId: fInv['Execução'], nome: 'Contagem do bloco B', data: d('2026-10-21'), status: 'Previsto' });
    await tx.insert(t.riscos).values({ faseId: fInv['Execução'], nome: 'Divergência alta entre sistema e estoque físico', nivel: 'Médio' });
    await reports(inv, [['2026-10-16', 'aten', 'Linha de base não congelada', 'Contagem do bloco A em andamento.', 'Contagem do bloco B.', 'Clara Mendes acima do cedido.']]);

    // CRM, ISO, embalagem e loja: planos simples
    const fCrm = await plano(crm, [['Iniciação', 0, 2], ['Levantamento de requisitos', 2, 3], ['Planejamento', 5, 3], ['Implantação', 8, 12], ['Treinamento', 20, 3], ['Operação assistida', 23, 3], ['Encerramento', 26, 2]], '2026-06-01');
    await aloc(fCrm, [['Implantação', 'Renata Souza', 20], ['Implantação', 'Marina Gomes', 40]]);
    await tarefas(crm, fCrm, [['Iniciação', 'Termo de abertura aprovado', 'Marina Gomes', '2026-06-12', true], ['Levantamento de requisitos', 'Requisitos validados', 'Renata Souza', '2026-07-03', true],
      ['Planejamento', 'Cronograma aprovado', 'Marina Gomes', '2026-07-24', true], ['Implantação', 'Migrar base de clientes', 'Marina Gomes', '2026-09-11', true],
      ['Implantação', 'Configurar funil de vendas', 'Renata Souza', '2026-10-09', true], ['Treinamento', 'Treinar vendedores', 'Marina Gomes', '2026-11-20', false],
      ['Operação assistida', 'Acompanhar primeiro mês de uso', 'Marina Gomes', '2026-12-11', false], ['Encerramento', 'Lições aprendidas registradas', 'Marina Gomes', '2026-12-18', false],
      ['Implantação', 'Integrar CRM ao e-mail', 'Renata Souza', '2026-10-02', true], ['Implantação', 'Relatórios gerenciais', 'Marina Gomes', '2026-10-16', true]]);
    await reports(crm, [['2026-10-16', 'ok', 'No prazo', 'Funil de vendas configurado.', 'Treinamento dos vendedores.', '—']]);

    const fIso = await plano(iso, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Execução', 5, 26], ['Encerramento', 31, 1]], '2026-07-20');
    await aloc(fIso, [['Execução', 'Júlia Tavares', 30]]);
    await tarefas(iso, fIso, [['Iniciação', 'Termo de abertura aprovado', 'Júlia Tavares', '2026-07-31', true], ['Planejamento', 'Plano de auditoria interna', 'Júlia Tavares', '2026-08-21', true],
      ['Execução', 'Mapear processos da produção', 'Júlia Tavares', '2026-10-30', false], ['Execução', 'Auditoria interna', 'Júlia Tavares', '2026-12-11', false],
      ['Execução', 'Auditoria de certificação', 'Júlia Tavares', '2027-02-19', false], ['Encerramento', 'Lições aprendidas registradas', 'Júlia Tavares', '2027-02-26', false]]);
    await tx.insert(t.riscos).values({ faseId: fIso['Execução'], nome: 'Processos sem dono definido', nivel: 'Alto' });
    await reports(iso, [['2026-10-06', 'aten', 'Linha de base não congelada', 'Plano de auditoria aprovado.', 'Mapear processos da produção.', 'Processos sem dono definido.']]);

    const fEmb = await plano(emb, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Contratação de fornecedor', 5, 4], ['Execução', 9, 12], ['Encerramento', 21, 1]], '2026-06-15');
    await tx.insert(t.linhasBase).values({ iniciativaId: emb, fases: [
      { id: fEmb['Iniciação'], nome: 'Iniciação', inicioSemana: 0, duracao: 2 }, { id: fEmb['Planejamento'], nome: 'Planejamento', inicioSemana: 2, duracao: 3 },
      { id: fEmb['Contratação de fornecedor'], nome: 'Contratação de fornecedor', inicioSemana: 5, duracao: 3 }, { id: fEmb['Execução'], nome: 'Execução', inicioSemana: 8, duracao: 12 },
      { id: fEmb['Encerramento'], nome: 'Encerramento', inicioSemana: 20, duracao: 1 }], congeladaEm: ts('2026-07-03') });
    await aloc(fEmb, [['Execução', 'Marcos Rocha', 30]]);
    await tarefas(emb, fEmb, [['Iniciação', 'Termo de abertura aprovado', 'Marcos Rocha', '2026-06-26', true], ['Planejamento', 'Projeto da linha aprovado', 'Marcos Rocha', '2026-07-17', true],
      ['Contratação de fornecedor', 'Contrato do equipamento assinado', 'Marcos Rocha', '2026-08-14', true], ['Execução', 'Instalação elétrica', 'Marcos Rocha', '2026-09-25', true],
      ['Execução', 'Entrega do equipamento', 'Marcos Rocha', '2026-10-09', true], ['Execução', 'Montagem da linha', 'Marcos Rocha', '2026-10-30', true],
      ['Execução', 'Comissionamento', 'Marcos Rocha', '2026-11-13', false], ['Encerramento', 'Lições aprendidas registradas', 'Marcos Rocha', '2026-11-20', false],
      ['Execução', 'Treinamento dos operadores', 'Marcos Rocha', '2026-10-09', false], ['Execução', 'Laudo de segurança', 'Marcos Rocha', '2026-10-02', true]]);
    await tx.insert(t.riscos).values({ faseId: fEmb['Execução'], nome: 'Fornecedor atrasar peças da esteira', nivel: 'Alto' });
    await reports(emb, [['2026-10-05', 'crit', '+1 semana(s)', 'Equipamento entregue com atraso.', 'Montagem da linha.', 'Fornecedor atrasou a entrega em 8 dias.']]);

    const fLoja = await plano(loja, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Contratação de fornecedor', 5, 3], ['Desenvolvimento', 8, 10], ['Testes', 18, 3], ['Implantação', 21, 2], ['Encerramento', 23, 1]], '2026-07-06');
    await tarefas(loja, fLoja, [['Iniciação', 'Termo de abertura aprovado', 'Marina Gomes', '2026-07-17', true], ['Planejamento', 'Cronograma aprovado', 'Marina Gomes', '2026-08-07', false],
      ['Contratação de fornecedor', 'Contratar plataforma', 'Marina Gomes', '2026-08-28', false], ['Desenvolvimento', 'Catálogo B2B', 'Marina Gomes', '2026-10-30', false],
      ['Encerramento', 'Lições aprendidas registradas', 'Marina Gomes', '2027-01-15', false]]);

    for (const x of [col, cli]) {
      const f = await plano(x, [['Iniciação', 0, 2], ['Planejamento', 2, 3], ['Execução', 5, 8], ['Encerramento', 13, 1]], x === col ? '2026-03-02' : '2026-05-18');
      await tarefas(x, f, [['Iniciação', 'Termo de abertura aprovado', 'Fábio Oliveira', '2026-03-13', true], ['Encerramento', 'Lições aprendidas registradas', 'Fábio Oliveira', '2026-08-14', true]]);
    }

    // Pedido de alocação de um pré-projeto (Reforma do CD)
    await tx.insert(t.pedidosAlocacao).values({ orgId, iniciativaId: ini['Reforma do centro de distribuição'], pessoaId: pes['Bruno Reis'], deltaPct: 20, aPartirDe: 'abril', solicitadoPor: pes['Mariana'], createdAt: ts('2026-10-15') });

    return { orgId };
  });
}
