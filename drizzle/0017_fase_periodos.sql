CREATE TABLE "fase_periodos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fase_id" uuid NOT NULL,
	"inicio_semana" integer NOT NULL,
	"duracao" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fase_periodos" ADD CONSTRAINT "fase_periodos_fase_id_projeto_fases_id_fk" FOREIGN KEY ("fase_id") REFERENCES "public"."projeto_fases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fase_periodos_fase" ON "fase_periodos" USING btree ("fase_id");--> statement-breakpoint
ALTER TABLE "fase_periodos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Cada fase que já existe ganha um período com as mesmas datas (nada muda na linha do tempo)
INSERT INTO "fase_periodos" ("fase_id", "inicio_semana", "duracao") SELECT "id", "inicio_semana", "duracao" FROM "projeto_fases";--> statement-breakpoint
-- As alocações passam a apontar para o período da fase delas
ALTER TABLE "alocacoes" ADD COLUMN "periodo_id" uuid;--> statement-breakpoint
UPDATE "alocacoes" a SET "periodo_id" = p."id" FROM "fase_periodos" p WHERE p."fase_id" = a."fase_id";--> statement-breakpoint
ALTER TABLE "alocacoes" ALTER COLUMN "periodo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_periodo_id_fase_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."fase_periodos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP INDEX "alocacoes_fase_pessoa";--> statement-breakpoint
CREATE UNIQUE INDEX "alocacoes_periodo_pessoa" ON "alocacoes" USING btree ("periodo_id","pessoa_id");
