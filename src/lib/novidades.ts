import 'server-only';
import { and, count, desc, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';

export type Novidade = { id: string; texto: string; link: string | null; lida: boolean; dia: string; hora: string };

/** Avisos de uma pessoa, do mais novo para o mais antigo (o histórico fica guardado). */
export async function novidadesDe(orgId: string, pessoaId: string, limite = 200): Promise<Novidade[]> {
  const rows = await db.select().from(t.notificacoes)
    .where(and(eq(t.notificacoes.orgId, orgId), eq(t.notificacoes.pessoaId, pessoaId)))
    .orderBy(desc(t.notificacoes.createdAt)).limit(limite);
  // data e hora no fuso de São Paulo, como o resto do TARS
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return rows.map((r) => ({ id: r.id, texto: r.texto, link: r.link, lida: r.lida, dia: dia.format(r.createdAt), hora: hora.format(r.createdAt) }));
}

export async function naoLidas(orgId: string, pessoaId: string): Promise<number> {
  const [r] = await db.select({ n: count() }).from(t.notificacoes)
    .where(and(eq(t.notificacoes.orgId, orgId), eq(t.notificacoes.pessoaId, pessoaId), eq(t.notificacoes.lida, false)));
  return Number(r?.n ?? 0);
}

/** Plano pessoal da pessoa para os itens da caixa (Meu TARS). */
export async function planosDe(orgId: string, pessoaId: string) {
  const rows = await db.select().from(t.planosPessoais).where(and(eq(t.planosPessoais.orgId, orgId), eq(t.planosPessoais.pessoaId, pessoaId)));
  return new Map<string, { plano: string | null; planejadoEm: string | null; adiadoAte: string | null; nota: string | null }>(rows.map((r) => [r.itemId, { plano: r.plano, planejadoEm: r.planejadoEm, adiadoAte: r.adiadoAte, nota: r.nota }]));
}

/** Tarefas pessoais da pessoa (abertas e as concluídas recentemente). Só ela vê. */
export async function tarefasPessoaisDe(orgId: string, pessoaId: string) {
  const rows = await db.select().from(t.tarefasPessoais).where(and(eq(t.tarefasPessoais.orgId, orgId), eq(t.tarefasPessoais.pessoaId, pessoaId))).orderBy(t.tarefasPessoais.createdAt);
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
  return rows.map((r) => ({ id: r.id, titulo: r.titulo, prazo: r.prazo, concluidaEm: r.concluidaEm ? dia.format(r.concluidaEm) : null }));
}
