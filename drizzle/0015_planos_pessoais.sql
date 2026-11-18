CREATE TABLE "planos_pessoais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"plano" text,
	"planejado_em" date,
	"adiado_ate" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planos_pessoais" ADD CONSTRAINT "planos_pessoais_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "planos_pessoa_item" ON "planos_pessoais" USING btree ("pessoa_id","item_id");--> statement-breakpoint
ALTER TABLE "planos_pessoais" ENABLE ROW LEVEL SECURITY;