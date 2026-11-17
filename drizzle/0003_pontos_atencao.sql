CREATE TABLE "pontos_atencao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"fase_id" uuid,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"destino" text NOT NULL,
	"destinatario_id" uuid,
	"prazo" date,
	"status" text DEFAULT 'aberto' NOT NULL,
	"resolucao" text,
	"aberto_por" uuid,
	"resolvido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pontos_atencao" ADD CONSTRAINT "pontos_atencao_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pontos_atencao" ADD CONSTRAINT "pontos_atencao_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pontos_atencao_org" ON "pontos_atencao" USING btree ("org_id","status");--> statement-breakpoint
ALTER TABLE "pontos_atencao" ENABLE ROW LEVEL SECURITY;
