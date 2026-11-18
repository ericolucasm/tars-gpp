CREATE TABLE "tarefas_pessoais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"prazo" date,
	"concluida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planos_pessoais" ADD COLUMN "nota" text;--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ADD CONSTRAINT "tarefas_pessoais_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tarefas_pessoais_pessoa" ON "tarefas_pessoais" USING btree ("pessoa_id");--> statement-breakpoint
ALTER TABLE "tarefas_pessoais" ENABLE ROW LEVEL SECURITY;