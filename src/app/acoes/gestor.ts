'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { gestorDe } from '@/lib/regras/pessoas';
import { noRaia, pessoa } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

/** Gestor aprova a iniciativa do time e ela segue para o PMO. */
export async function aprovarComoGestor(iniciativaId: string) {
  return executar(async () => {
    const { dados, eu, autoria, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && noRaia(dados, ini, 'sol') && ini.solStatus === 'aguardando_gestor', 'Esta iniciativa não está mais aguardando aprovação.');
    exigir(ini.aprovadorId === eu.id || ehPmo, 'Só o gestor responsável pode aprovar.');
    const sol = dados.raias.find((r) => r.id === ini.raiaId)!;
    const agora = new Date();
    await db.update(t.iniciativas).set({ solStatus: 'aguardando_pmo', aprovadaGestorEm: agora, updatedAt: agora, progressoGates: { ...ini.progressoGates, gestor: sol.criterios.map(() => true) } }).where(eq(t.iniciativas.id, ini.id));
    await db.insert(t.transicoes).values({ orgId: dados.org.id, iniciativaId: ini.id, acao: 'aprovar_gestor', deRaiaId: ini.raiaId, paraRaiaId: ini.raiaId, criterios: sol.criterios.map((c) => ({ ...c, marcado: true })), ...autoria });
    await notificar(dados.org.id, [ini.solicitanteId], `"${ini.titulo}" foi aprovada por ${eu.nome} e segue para o PMO.`, '/inicio');
    return { ok: true, msg: `“${ini.titulo}” aprovada e enviada ao PMO.` };
  });
}

/** Gestor devolve a iniciativa ao solicitante com o que precisa ser ajustado. */
export async function devolverParaAjuste(iniciativaId: string, nota: string) {
  return executar(async () => {
    const { dados, eu, autoria, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && noRaia(dados, ini, 'sol') && ini.solStatus === 'aguardando_gestor', 'Esta iniciativa não está mais aguardando aprovação.');
    exigir(ini.aprovadorId === eu.id || ehPmo, 'Só o gestor responsável pode devolver.');
    const agora = new Date();
    await db.update(t.iniciativas).set({ solStatus: 'devolvida', devolucaoNota: nota.trim() || null, devolvidaEm: agora, updatedAt: agora }).where(eq(t.iniciativas.id, ini.id));
    await db.insert(t.transicoes).values({ orgId: dados.org.id, iniciativaId: ini.id, acao: 'devolver', deRaiaId: ini.raiaId, paraRaiaId: ini.raiaId, motivo: nota.trim() || null, ...autoria });
    const sol = pessoa(dados, ini.solicitanteId);
    await notificar(dados.org.id, [ini.solicitanteId], `${eu.nome} devolveu "${ini.titulo}" para ajuste.`, `/iniciativas/${ini.id}/editar`);
    return { ok: true, msg: `“${ini.titulo}” devolvida para ${sol?.nome ?? 'o solicitante'} ajustar.` };
  });
}

/** Quanto uma pessoa do time pode ceder para projetos (definido pelo gestor dela). */
export async function definirCedencia(pessoaId: string, pct: number) {
  return executar(async () => {
    const { dados, eu, sessao } = await contexto();
    const p = pessoa(dados, pessoaId);
    exigir(p, 'Pessoa não encontrada.');
    exigir(gestorDe(p, dados.areas) === eu.id || sessao.admin, 'Só o gestor da pessoa define quanto ela pode ceder.');
    const v = Math.max(0, Math.min(100, Math.round(pct / 10) * 10));
    await db.update(t.pessoas).set({ cedeAte: v }).where(eq(t.pessoas.id, p.id));
  });
}

/** Gestor responde a um pedido de alocação: cede (o limite sobe) ou recusa (o GP é avisado). */
export async function responderPedido(pedidoId: string, aceitar: boolean) {
  return executar(async () => {
    const { dados, eu, sessao } = await contexto();
    const ped = dados.pedidos.find((x) => x.id === pedidoId);
    exigir(ped && ped.status === 'pendente', 'Este pedido já foi respondido.');
    const p = pessoa(dados, ped.pessoaId);
    exigir(p, 'Pessoa não encontrada.');
    exigir(gestorDe(p, dados.areas) === eu.id || sessao.admin, 'Só o gestor da pessoa responde este pedido.');
    const proj = dados.iniciativas.find((i) => i.id === ped.iniciativaId);
    const agora = new Date();
    await db.update(t.pedidosAlocacao).set({ status: aceitar ? 'aceito' : 'recusado', decididoPor: eu.id, decididoEm: agora }).where(eq(t.pedidosAlocacao.id, ped.id));
    const solicitante = ped.solicitadoPor ?? proj?.gpId;
    if (aceitar) {
      await db.update(t.pessoas).set({ cedeAte: Math.min(100, (p.cedeAte ?? 0) + ped.deltaPct) }).where(eq(t.pessoas.id, p.id));
      await notificar(dados.org.id, [solicitante], `${eu.nome} cedeu +${ped.deltaPct}% de ${p.nome} para ${proj?.titulo ?? 'o projeto'}.`, proj ? `/projetos/${proj.id}` : undefined);
      return { ok: true, msg: `Você cedeu +${ped.deltaPct}% de ${p.nome} para ${proj?.titulo ?? 'o projeto'}.` };
    }
    await notificar(dados.org.id, [solicitante], `${eu.nome} recusou o pedido de +${ped.deltaPct}% de ${p.nome} para ${proj?.titulo ?? 'o projeto'}.`, proj ? `/projetos/${proj.id}` : undefined);
    return { ok: true, msg: `Pedido recusado. ${proj?.gpId ? 'O GP' : 'Quem pediu'} de ${proj?.titulo ?? 'o projeto'} foi avisado.` };
  });
}
