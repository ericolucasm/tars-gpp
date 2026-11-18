'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { br, hojeISO } from '@/lib/regras/datas';
import { validarDelegacao } from '@/lib/regras/delegacao';
import { pessoa } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

/** O gestor indica um substituto por um período: nesse tempo o substituto decide as aprovações, os pedidos e o time no lugar dele. */
export async function definirSubstituto(x: { substitutoId: string; inicio: string; fim: string }) {
  return executar(async () => {
    const { dados, eu } = await contexto();
    exigir(eu.perfis.includes('gestor'), 'Só gestores indicam substituto.');
    const erro = validarDelegacao(x, eu.id, hojeISO(), (id) => !!pessoa(dados, id)?.perfis.includes('gestor'));
    exigir(!erro, erro ?? '');
    await db.insert(t.delegacoes).values({ orgId: dados.org.id, gestorId: eu.id, substitutoId: x.substitutoId, inicio: x.inicio, fim: x.fim });
    const sub = pessoa(dados, x.substitutoId)!;
    await notificar(dados.org.id, [sub.id], `${eu.nome} indicou você como substituto(a) de ${br(x.inicio)} a ${br(x.fim)}: nesse período, as aprovações, os pedidos de alocação e o time dele(a) ficam com você.`, '/area/iniciativas');
    return { ok: true, msg: `${sub.nome} vai substituir você de ${br(x.inicio)} a ${br(x.fim)}.` };
  });
}

export async function removerSubstituto(id: string) {
  return executar(async () => {
    const { dados, eu } = await contexto();
    const dl = dados.delegacoes.find((x) => x.id === id);
    exigir(dl && dl.gestorId === eu.id, 'Só quem indicou o substituto pode cancelar.');
    await db.delete(t.delegacoes).where(and(eq(t.delegacoes.id, id), eq(t.delegacoes.gestorId, eu.id)));
    await notificar(dados.org.id, [dl.substitutoId], `${eu.nome} cancelou a substituição de ${br(dl.inicio)} a ${br(dl.fim)}.`);
    return { ok: true, msg: 'Substituição cancelada.' };
  });
}
