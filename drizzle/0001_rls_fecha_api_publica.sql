-- Supabase expõe o schema public numa API REST acessível com a chave anon (pública).
-- O TARS acessa o banco só pelo servidor, com o usuário dono das tabelas (que ignora RLS).
-- Ligar RLS sem políticas fecha essa API pública sem mudar nada no app.
ALTER TABLE "alocacoes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "avaliacoes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ciclos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fases_biblioteca" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "iniciativas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "linhas_base" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marcos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "modelos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mudancas_base" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notificacoes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orgs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pedidos_alocacao" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pessoas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projeto_fases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "raias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "riscos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "status_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tarefas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transicoes" ENABLE ROW LEVEL SECURITY;
