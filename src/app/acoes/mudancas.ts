'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { dinheiro } from '@/lib/regras/datas';
import { TIPOS_MUDANCA, validarPedidoMudanca } from '@/lib/regras/mudancas';
import { orcamentoDoProjeto } from '@/lib/visoes';
import { contexto, executar, exigir, exigirPmo, notificar } from './_ctx';

/** GP (ou PMO) pede mudança de escopo ou de custo. O PMO decide. */
export async function pedirMudanca(iniciativaId: string, p: { tipo: string; descricao: string; justificativa: string; valorNovo: number | null }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
    exigir(ini.gpId === eu.id || ehPmo, 'Só o gerente do projeto ou o PMO podem pedir mudança.');
    const atual = orcamentoDoProjeto(ini);
    const erro = validarPedidoMudanca(p, atual);
    exigir(!erro, erro ?? '');
    exigir(!dados.pedidosMudanca.some((x) => x.iniciativaId === ini.id && x.tipo === p.tipo && x.status === 'pendente'), `Já existe um pedido de mudança de ${TIPOS_MUDANCA[p.tipo].toLowerCase()} aguardando o PMO neste projeto.`);
    await db.insert(t.pedidosMudanca).values({
      orgId: dados.org.id, iniciativaId: ini.id, tipo: p.tipo, descricao: p.descricao.trim(), justificativa: p.justificativa.trim(),
      valorAnterior: p.tipo === 'custo' ? atual : null, valorNovo: p.tipo === 'custo' ? p.valorNovo : null, solicitanteId: eu.id,
    });
    await notificar(dados.org.id, dados.pessoas.filter((x) => x.perfis.includes('pmo')).map((x) => x.id), `${eu.nome} pede mudança de ${TIPOS_MUDANCA[p.tipo].toLowerCase()} em ${ini.titulo}.`, `/projetos/${ini.id}#mudancas`);
    return { ok: true, msg: `Pedido de mudança de ${TIPOS_MUDANCA[p.tipo].toLowerCase()} enviado ao PMO.` };
  });
}

/** PMO aprova ou recusa. Custo aprovado vira o novo orçamento aprovado do projeto. */
export async function decidirMudanca(id: string, aprovar: boolean, comentario: string) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const { dados, eu } = ctx;
    const m = dados.pedidosMudanca.find((x) => x.id === id);
    exigir(m && m.status === 'pendente', 'Este pedido já foi decidido.');
    exigir(aprovar || comentario.trim().length >= 3, 'Conte ao GP por que o pedido foi recusado.');
    await db.transaction(async (tx) => {
      await tx.update(t.pedidosMudanca).set({ status: aprovar ? 'aprovada' : 'recusada', comentarioDecisao: comentario.trim() || null, decididoPor: eu.id, decididoEm: new Date() }).where(eq(t.pedidosMudanca.id, id));
      if (aprovar && m.tipo === 'custo' && m.valorNovo) await tx.update(t.iniciativas).set({ orcamentoAprovado: m.valorNovo, updatedAt: new Date() }).where(eq(t.iniciativas.id, m.iniciativaId));
    });
    const ini = dados.iniciativas.find((i) => i.id === m.iniciativaId);
    await notificar(dados.org.id, [m.solicitanteId, ini?.gpId], `O PMO ${aprovar ? 'aprovou' : 'recusou'} a mudança de ${TIPOS_MUDANCA[m.tipo].toLowerCase()} em ${ini?.titulo ?? ''}.`, `/projetos/${m.iniciativaId}#mudancas`);
    return { ok: true, msg: aprovar ? (m.tipo === 'custo' && m.valorNovo ? `Mudança aprovada. Novo orçamento: ${dinheiro(m.valorNovo)}.` : 'Mudança de escopo aprovada.') : 'Mudança recusada. O GP foi avisado.' };
  });
}
