CREATE TABLE "pedidos_prazo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"alvo_id" uuid NOT NULL,
	"prazo_atual" date,
	"novo_prazo" date NOT NULL,
	"motivo" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"solicitante_id" uuid,
	"decidido_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decidido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "status_cadencia" text DEFAULT 'semanal' NOT NULL;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "status_dia" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "projeto_fases" ADD COLUMN "responsavel_id" uuid;--> statement-breakpoint
ALTER TABLE "pedidos_prazo" ADD CONSTRAINT "pedidos_prazo_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos_prazo" ENABLE ROW LEVEL SECURITY;
