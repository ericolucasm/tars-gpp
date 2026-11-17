ALTER TABLE "riscos" ADD COLUMN "probabilidade" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "riscos" ADD COLUMN "impacto" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "riscos" ADD COLUMN "responsavel_id" uuid;--> statement-breakpoint
ALTER TABLE "riscos" ADD COLUMN "plano" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "riscos" ADD COLUMN "status" text DEFAULT 'aberto' NOT NULL;--> statement-breakpoint
ALTER TABLE "riscos" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- riscos já cadastrados: probabilidade × impacto equivalentes ao nível que tinham
UPDATE "riscos" SET "probabilidade" = 3, "impacto" = 2 WHERE "nivel" = 'Alto';--> statement-breakpoint
UPDATE "riscos" SET "probabilidade" = 1, "impacto" = 2 WHERE "nivel" = 'Baixo';
