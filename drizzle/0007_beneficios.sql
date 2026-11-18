ALTER TABLE "iniciativas" ADD COLUMN "beneficio_indicador" text;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_meta" text;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_medir_em" date;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_resultado" text;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_atingido" text;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_medido_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iniciativas" ADD COLUMN "beneficio_medido_por" uuid;