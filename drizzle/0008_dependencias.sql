CREATE TABLE "dependencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"depende_de_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"precisa_ate" date NOT NULL,
	"criado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dependencias" ADD CONSTRAINT "dependencias_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencias" ADD CONSTRAINT "dependencias_depende_de_id_iniciativas_id_fk" FOREIGN KEY ("depende_de_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dependencias" ENABLE ROW LEVEL SECURITY;
