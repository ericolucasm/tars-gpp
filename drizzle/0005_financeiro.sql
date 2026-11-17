CREATE TABLE "lancamentos_custo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"data" date NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric NOT NULL,
	"autor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "previsao_custo" numeric;--> statement-breakpoint
ALTER TABLE "lancamentos_custo" ADD CONSTRAINT "lancamentos_custo_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos_custo" ENABLE ROW LEVEL SECURITY;
