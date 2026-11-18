CREATE TABLE "delegacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"gestor_id" uuid NOT NULL,
	"substituto_id" uuid NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delegacoes" ADD CONSTRAINT "delegacoes_gestor_id_pessoas_id_fk" FOREIGN KEY ("gestor_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegacoes" ADD CONSTRAINT "delegacoes_substituto_id_pessoas_id_fk" FOREIGN KEY ("substituto_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegacoes" ENABLE ROW LEVEL SECURITY;