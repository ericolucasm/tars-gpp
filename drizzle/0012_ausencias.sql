CREATE TABLE "ausencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"motivo" text NOT NULL,
	"registrada_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ausencias" ENABLE ROW LEVEL SECURITY;
