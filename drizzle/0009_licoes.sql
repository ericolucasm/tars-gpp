CREATE TABLE "licoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"iniciativa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"texto" text NOT NULL,
	"autor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "licoes" ADD CONSTRAINT "licoes_iniciativa_id_iniciativas_id_fk" FOREIGN KEY ("iniciativa_id") REFERENCES "public"."iniciativas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licoes" ENABLE ROW LEVEL SECURITY;
