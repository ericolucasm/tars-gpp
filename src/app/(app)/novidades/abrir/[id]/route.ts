import { NextResponse, type NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { getSessao } from '@/lib/sessao';
import { podeMarcarLida } from '@/lib/regras/novidades';

/** Abre um aviso: marca como lido (só a própria pessoa) e leva ao link dele. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await getSessao();
  if (!sessao) return NextResponse.redirect(new URL('/login', req.url));
  const n = await db.query.notificacoes.findFirst({ where: and(eq(t.notificacoes.id, id), eq(t.notificacoes.orgId, sessao.orgId), eq(t.notificacoes.pessoaId, sessao.pessoa.id)) });
  if (!n) return NextResponse.redirect(new URL('/novidades', req.url));
  if (!n.lida && podeMarcarLida({ realId: sessao.real.id, pessoaId: sessao.pessoa.id })) await db.update(t.notificacoes).set({ lida: true }).where(eq(t.notificacoes.id, n.id));
  const destino = n.link && n.link.startsWith('/') ? n.link : '/novidades'; // só links internos
  return NextResponse.redirect(new URL(destino, req.url));
}
