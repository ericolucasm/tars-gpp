CREATE TABLE "pedidos_mudanca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text NOT NULL,
	"justificativa" text DEFAULT '' NOT NULL,
	"valor_anterior" numeric,
	"valor_novo" numeric,
	"status" text DEFAULT 'pendente' NOT NULL,
	"comentario_decisao" text,
	"solicitante_id" uuid,
	"decidido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decidido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "orcamento_aprovado" numeric;--> statement-breakpoint
ALTER TABLE "pedidos_mudanca" ADD CONSTRAINT "pedidos_mudanca_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_mudanca" ENABLE ROW LEVEL SECURITY;
