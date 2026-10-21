CREATE TABLE "alocacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fase_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"pct" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"parent_id" uuid,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"responsavel_id" uuid,
	"headcount" integer,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "avaliacoes" (
	"iniciativa_id" uuid NOT NULL,
	"ciclo_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"notas" integer[] DEFAULT '{0,0,0,0}' NOT NULL,
	"decisao" text,
	"motivo_recusa" text,
	"comunicado" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacoes_iniciativa_id_ciclo_id_pk" PRIMARY KEY("iniciativa_id","ciclo_id")
);
--> statement-breakpoint
CREATE TABLE "ciclos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ano" integer NOT NULL,
	"descricao" text,
	"abertura" date NOT NULL,
	"fechamento" date NOT NULL,
	"avaliacao_ate" date NOT NULL,
	"comunicar_ate" date NOT NULL,
	"play_a_partir" text,
	"orcamento_ref" numeric DEFAULT 0 NOT NULL,
	"publico" text DEFAULT 'todas' NOT NULL,
	"areas_publico" uuid[] DEFAULT '{}' NOT NULL,
	"aviso_abertura" boolean DEFAULT true NOT NULL,
	"aviso_lembrete" boolean DEFAULT true NOT NULL,
	"aviso_cobranca" boolean DEFAULT true NOT NULL,
	"etapa" text DEFAULT 'planejado' NOT NULL,
	"comunicado_em" date,
	"snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "fases_biblioteca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"duracao_semanas" integer NOT NULL,
	"criterio_conclusao" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iniciativas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"problema" text DEFAULT '' NOT NULL,
	"resultado_esperado" text DEFAULT '' NOT NULL,
	"tipo" text NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"area_id" uuid,
	"patrocinador_texto" text,
	"patrocinador_id" uuid,
	"areas_impactadas" uuid[] DEFAULT '{}' NOT NULL,
	"urgencia" text DEFAULT 'esp' NOT NULL,
	"justificativa_urgencia" text,
	"inicio_desejado" text,
	"entrega_desejada" text,
	"faixa_custo" text DEFAULT 'Não sei' NOT NULL,
	"custo_estimado" numeric,
	"fornecedor" text DEFAULT 'Não sei' NOT NULL,
	"esforco" text,
	"ciclo_id" uuid,
	"raia_id" uuid NOT NULL,
	"sol_status" text,
	"aprovador_id" uuid,
	"devolucao_nota" text,
	"situacao" text,
	"prioridade" text,
	"progresso_gates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gp_id" uuid,
	"modelo_id" uuid,
	"inicio_projeto" date,
	"farol" text,
	"motivo_saida" text,
	"retomada_prevista" date,
	"enviada_em" timestamp with time zone,
	"aprovada_gestor_em" timestamp with time zone,
	"devolvida_em" timestamp with time zone,
	"classificada_em" timestamp with time zone,
	"pre_aprovada_em" timestamp with time zone,
	"play_em" timestamp with time zone,
	"pausada_em" timestamp with time zone,
	"concluida_em" timestamp with time zone,
	"cancelada_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linhas_base" (
	"iniciativa_id" uuid PRIMARY KEY NOT NULL,
	"fases" jsonb NOT NULL,
	"congelada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"congelada_por" uuid
);
--> statement-breakpoint
CREATE TABLE "marcos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fase_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"data" date,
	"status" text DEFAULT 'Previsto' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"fases" uuid[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mudancas_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"fases" jsonb NOT NULL,
	"descricao" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"solicitante_id" uuid,
	"decidido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decidido_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"link" text,
	"lida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"modo_captacao" text DEFAULT 'misto' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos_alocacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"delta_pct" integer NOT NULL,
	"a_partir_de" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"solicitado_por" uuid,
	"decidido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decidido_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pessoas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "pessoas_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"org_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"area_id" uuid,
	"cargo" text,
	"perfis" text[] DEFAULT '{}' NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	"cede_ate" integer,
	"externo" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'ativo' NOT NULL,
	"tratamento" text DEFAULT 'n' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projeto_fases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"inicio_semana" integer NOT NULL,
	"duracao" integer NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criterio_conclusao" text DEFAULT '' NOT NULL,
	"confirmada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "raias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"chave" text,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"aprovador" text DEFAULT 'PMO' NOT NULL,
	"tipo_card" text DEFAULT 'Iniciativa' NOT NULL,
	"ordem" integer NOT NULL,
	"saida" boolean DEFAULT false NOT NULL,
	"criterios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gate_titulo" text,
	"gate_dica" text,
	"gate_confirmar" text,
	"acao_rotulo" text,
	"criterios_retomada" jsonb
);
--> statement-breakpoint
CREATE TABLE "riscos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fase_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"nivel" text DEFAULT 'Alto' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"data" date NOT NULL,
	"farol" text NOT NULL,
	"desvio" text NOT NULL,
	"avancou" text NOT NULL,
	"a_seguir" text NOT NULL,
	"atencao" text NOT NULL,
	"autor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"fase_id" uuid,
	"titulo" text NOT NULL,
	"responsavel_id" uuid,
	"prazo" date,
	"concluida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transicoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"de_raia_id" uuid,
	"para_raia_id" uuid,
	"criterios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"motivo" text,
	"autor_id" uuid,
	"em_nome_de_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fases_biblioteca" ADD CONSTRAINT "fases_biblioteca_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD CONSTRAINT "iniciativas_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linhas_base" ADD CONSTRAINT "linhas_base_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marcos" ADD CONSTRAINT "marcos_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mudancas_base" ADD CONSTRAINT "mudancas_base_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_alocacao" ADD CONSTRAINT "pedidos_alocacao_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projeto_fases" ADD CONSTRAINT "projeto_fases_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raias" ADD CONSTRAINT "raias_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "riscos" ADD CONSTRAINT "riscos_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_reports" ADD CONSTRAINT "status_reports_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transicoes" ADD CONSTRAINT "transicoes_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alocacoes_fase_pessoa" ON "alocacoes" USING btree ("fase_id","pessoa_id");--> statement-breakpoint
CREATE INDEX "iniciativas_org_raia" ON "iniciativas" USING btree ("org_id","raia_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pessoas_org_email" ON "pessoas" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "pessoas_auth" ON "pessoas" USING btree ("auth_user_id");