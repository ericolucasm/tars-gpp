import {
  pgTable, uuid, text, integer, boolean, date, timestamp, jsonb, numeric, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

// Convenção: nomes em português, como nas telas. Toda tabela de negócio carrega org_id (multiempresa desde o início).

export type ConfigOrg = {
  pesos: [number, number, number, number]; // Impacto, Urgência, Alinhamento, Facilidade (somam 100)
  motivos: { recusa: string[]; pausa: string[]; cancelamento: string[] };
};

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  modoCaptacao: text('modo_captacao').notNull().default('misto'), // misto | ciclo | continuo
  config: jsonb('config').$type<ConfigOrg>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(), // Diretoria | Gerência | Coordenação
  responsavelId: uuid('responsavel_id'),
  headcount: integer('headcount'),
  ordem: integer('ordem').notNull().default(0),
});

export const pessoas = pgTable('pessoas', {
  id: uuid('id').primaryKey().defaultRandom(),
  seq: integer('seq').generatedAlwaysAsIdentity(), // ordem de cadastro
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  authUserId: text('auth_user_id'), // id do usuário no login (auth_user)
  nome: text('nome').notNull(),
  email: text('email').notNull(),
  areaId: uuid('area_id'),
  cargo: text('cargo'),
  perfis: text('perfis').array().notNull().default([]), // colaborador | gestor | gp | pmo | patrocinador
  admin: boolean('admin').notNull().default(false),
  cedeAte: integer('cede_ate'), // % máximo para projetos; null = sem limite (externo) ou não definido
  externo: boolean('externo').notNull().default(false),
  status: text('status').notNull().default('ativo'), // ativo | convite
  tratamento: text('tratamento').notNull().default('n'), // f | m | n — só para rótulos ("Gestora"/"Gestor"/"Gestor(a)")
}, (t) => [uniqueIndex('pessoas_org_email').on(t.orgId, t.email), index('pessoas_auth').on(t.authUserId)]);

export const ciclos = pgTable('ciclos', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  ano: integer('ano').notNull(),
  descricao: text('descricao'),
  abertura: date('abertura').notNull(),
  fechamento: date('fechamento').notNull(),
  avaliacaoAte: date('avaliacao_ate').notNull(),
  comunicarAte: date('comunicar_ate').notNull(),
  playAPartir: text('play_a_partir'),
  orcamentoRef: numeric('orcamento_ref', { mode: 'number' }).notNull().default(0),
  publico: text('publico').notNull().default('todas'), // todas | selecionadas
  areasPublico: uuid('areas_publico').array().notNull().default([]),
  avisoAbertura: boolean('aviso_abertura').notNull().default(true),
  avisoLembrete: boolean('aviso_lembrete').notNull().default(true),
  avisoCobranca: boolean('aviso_cobranca').notNull().default(true),
  etapa: text('etapa').notNull().default('planejado'), // planejado | inscricoes | avaliacao | comunicado | encerrado
  comunicadoEm: date('comunicado_em'),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>(),
});

export type Criterio = { texto: string; obrigatorio: boolean };

export const raias = pgTable('raias', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  chave: text('chave'), // sol | bkl | pre | exe | pau | con | can — null para raias criadas pelo usuário
  nome: text('nome').notNull(),
  descricao: text('descricao').notNull().default(''),
  aprovador: text('aprovador').notNull().default('PMO'),
  tipoCard: text('tipo_card').notNull().default('Iniciativa'), // Iniciativa | Projeto
  ordem: integer('ordem').notNull(),
  saida: boolean('saida').notNull().default(false),
  criterios: jsonb('criterios').$type<Criterio[]>().notNull().default([]),
  gateTitulo: text('gate_titulo'),
  gateDica: text('gate_dica'),
  gateConfirmar: text('gate_confirmar'),
  acaoRotulo: text('acao_rotulo'),
  criteriosRetomada: jsonb('criterios_retomada').$type<Criterio[]>(), // só na raia "pau"
});

export const fasesBiblioteca = pgTable('fases_biblioteca', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  duracaoSemanas: integer('duracao_semanas').notNull(),
  criterioConclusao: text('criterio_conclusao').notNull().default(''),
  ordem: integer('ordem').notNull().default(0),
});

export const modelos = pgTable('modelos', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  descricao: text('descricao').notNull().default(''),
  fases: uuid('fases').array().notNull().default([]), // ids de fases_biblioteca, em ordem
});

export const iniciativas = pgTable('iniciativas', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  titulo: text('titulo').notNull(),
  problema: text('problema').notNull().default(''),
  resultadoEsperado: text('resultado_esperado').notNull().default(''),
  tipo: text('tipo').notNull(), // est | mel | obr | man
  solicitanteId: uuid('solicitante_id').notNull(),
  areaId: uuid('area_id'),
  patrocinadorTexto: text('patrocinador_texto'),
  patrocinadorId: uuid('patrocinador_id'),
  areasImpactadas: uuid('areas_impactadas').array().notNull().default([]),
  urgencia: text('urgencia').notNull().default('esp'), // esp | ano | urg
  justificativaUrgencia: text('justificativa_urgencia'),
  inicioDesejado: text('inicio_desejado'), // AAAA-MM
  entregaDesejada: text('entrega_desejada'),
  faixaCusto: text('faixa_custo').notNull().default('Não sei'),
  custoEstimado: numeric('custo_estimado', { mode: 'number' }),
  fornecedor: text('fornecedor').notNull().default('Não sei'),
  esforco: text('esforco'), // pequeno | médio | grande
  cicloId: uuid('ciclo_id'), // null = fora do ciclo
  raiaId: uuid('raia_id').notNull(),
  solStatus: text('sol_status'), // rascunho | aguardando_gestor | devolvida | aguardando_pmo (só na raia sol)
  aprovadorId: uuid('aprovador_id'),
  devolucaoNota: text('devolucao_nota'),
  devolvidaPorId: uuid('devolvida_por_id'),
  devolucaoOrigem: text('devolucao_origem'), // gestor | pmo: define para onde a iniciativa volta ao ser reenviada
  situacao: text('situacao'),
  prioridade: text('prioridade'), // Alta | Média | Baixa
  progressoGates: jsonb('progresso_gates').$type<Record<string, boolean[]>>().notNull().default({}),
  // campos de projeto
  gpId: uuid('gp_id'),
  modeloId: uuid('modelo_id'),
  inicioProjeto: date('inicio_projeto'),
  farol: text('farol'), // ok | aten | crit
  motivoSaida: text('motivo_saida'),
  retomadaPrevista: date('retomada_prevista'),
  // carimbos de tempo do fluxo
  enviadaEm: timestamp('enviada_em', { withTimezone: true }),
  aprovadaGestorEm: timestamp('aprovada_gestor_em', { withTimezone: true }),
  devolvidaEm: timestamp('devolvida_em', { withTimezone: true }),
  classificadaEm: timestamp('classificada_em', { withTimezone: true }),
  preAprovadaEm: timestamp('pre_aprovada_em', { withTimezone: true }),
  playEm: timestamp('play_em', { withTimezone: true }),
  pausadaEm: timestamp('pausada_em', { withTimezone: true }),
  concluidaEm: timestamp('concluida_em', { withTimezone: true }),
  canceladaEm: timestamp('cancelada_em', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('iniciativas_org_raia').on(t.orgId, t.raiaId)]);

export const transicoes = pgTable('transicoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  acao: text('acao').notNull(),
  deRaiaId: uuid('de_raia_id'),
  paraRaiaId: uuid('para_raia_id'),
  criterios: jsonb('criterios').$type<(Criterio & { marcado: boolean })[]>().notNull().default([]),
  motivo: text('motivo'),
  autorId: uuid('autor_id'),
  emNomeDeId: uuid('em_nome_de_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const avaliacoes = pgTable('avaliacoes', {
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  cicloId: uuid('ciclo_id').notNull(), // ciclo em que a avaliação aconteceu
  orgId: uuid('org_id').notNull(),
  notas: integer('notas').array().notNull().default([0, 0, 0, 0]), // 0 = sem nota
  decisao: text('decisao'), // pre | bkl | rec
  motivoRecusa: text('motivo_recusa'),
  comunicado: boolean('comunicado').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.iniciativaId, t.cicloId] })]);

export const projetoFases = pgTable('projeto_fases', {
  id: uuid('id').primaryKey().defaultRandom(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  inicioSemana: integer('inicio_semana').notNull(),
  duracao: integer('duracao').notNull(),
  ordem: integer('ordem').notNull().default(0),
  criterioConclusao: text('criterio_conclusao').notNull().default(''),
  confirmadaEm: timestamp('confirmada_em', { withTimezone: true }),
});

export type FaseBase = { id: string; nome: string; inicioSemana: number; duracao: number };

export const linhasBase = pgTable('linhas_base', {
  iniciativaId: uuid('iniciativa_id').primaryKey().references(() => iniciativas.id, { onDelete: 'cascade' }),
  fases: jsonb('fases').$type<FaseBase[]>().notNull(),
  congeladaEm: timestamp('congelada_em', { withTimezone: true }).notNull().defaultNow(),
  congeladaPor: uuid('congelada_por'),
});

export const mudancasBase = pgTable('mudancas_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  fases: jsonb('fases').$type<FaseBase[]>().notNull(),
  descricao: text('descricao').notNull(),
  status: text('status').notNull().default('pendente'), // pendente | aprovada | recusada
  solicitanteId: uuid('solicitante_id'),
  decididoPor: uuid('decidido_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decididoEm: timestamp('decidido_em', { withTimezone: true }),
});

export const alocacoes = pgTable('alocacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  faseId: uuid('fase_id').notNull().references(() => projetoFases.id, { onDelete: 'cascade' }),
  pessoaId: uuid('pessoa_id').notNull(),
  pct: integer('pct').notNull(),
}, (t) => [uniqueIndex('alocacoes_fase_pessoa').on(t.faseId, t.pessoaId)]);

export const tarefas = pgTable('tarefas', {
  id: uuid('id').primaryKey().defaultRandom(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  faseId: uuid('fase_id').references(() => projetoFases.id, { onDelete: 'cascade' }),
  titulo: text('titulo').notNull(),
  responsavelId: uuid('responsavel_id'),
  prazo: date('prazo'),
  concluida: boolean('concluida').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const marcos = pgTable('marcos', {
  id: uuid('id').primaryKey().defaultRandom(),
  faseId: uuid('fase_id').notNull().references(() => projetoFases.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  data: date('data'),
  status: text('status').notNull().default('Previsto'), // Previsto | Em risco | Atingido
});

export const riscos = pgTable('riscos', {
  id: uuid('id').primaryKey().defaultRandom(),
  faseId: uuid('fase_id').notNull().references(() => projetoFases.id, { onDelete: 'cascade' }),
  nome: text('nome').notNull(),
  nivel: text('nivel').notNull().default('Alto'), // Alto | Médio | Baixo
});

export const statusReports = pgTable('status_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  data: date('data').notNull(),
  farol: text('farol').notNull(),
  desvio: text('desvio').notNull(),
  avancou: text('avancou').notNull(),
  aSeguir: text('a_seguir').notNull(),
  atencao: text('atencao').notNull(),
  autorId: uuid('autor_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pedidosAlocacao = pgTable('pedidos_alocacao', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  iniciativaId: uuid('iniciativa_id').notNull().references(() => iniciativas.id, { onDelete: 'cascade' }),
  pessoaId: uuid('pessoa_id').notNull(),
  deltaPct: integer('delta_pct').notNull(),
  aPartirDe: text('a_partir_de'),
  status: text('status').notNull().default('pendente'), // pendente | aceito | recusado | cancelado
  solicitadoPor: uuid('solicitado_por'),
  decididoPor: uuid('decidido_por'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  decididoEm: timestamp('decidido_em', { withTimezone: true }),
});

export const notificacoes = pgTable('notificacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  pessoaId: uuid('pessoa_id').notNull(),
  texto: text('texto').notNull(),
  link: text('link'),
  lida: boolean('lida').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Login (Better Auth) ----------
// Tabelas mantidas pela biblioteca de login. As chaves JS seguem os nomes de campo que ela espera.

export const authUser = pgTable('auth_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable('auth_session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
}, (t) => [index('auth_session_user').on(t.userId)]);

export const authAccount = pgTable('auth_account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('auth_account_user').on(t.userId)]);

export const authVerification = pgTable('auth_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
