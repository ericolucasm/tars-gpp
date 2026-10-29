ALTER TABLE "iniciativas" ADD COLUMN "devolvida_por_id" uuid;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "devolucao_origem" text;--> statement-breakpoint
-- devoluções que já existiam foram todas feitas pelo gestor
UPDATE "iniciativas" SET "devolucao_origem" = 'gestor', "devolvida_por_id" = "aprovador_id" WHERE "sol_status" = 'devolvida';
