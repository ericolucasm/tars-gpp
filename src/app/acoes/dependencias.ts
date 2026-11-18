'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { noRaia } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

/** O GP (ou PMO) registra que o projeto dele precisa de uma entrega de outro projeto até uma data. */
export async function adicionarDependencia(iniciativaId: string, n: { dependeDeId: string; descricao: string; precisaAte: string }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
    exigir(ehPmo || ini.gpId === eu.id, 'Só o gerente do projeto ou o PMO podem registrar dependências.');
    const de = dados.iniciativas.find((i) => i.id === n.dependeDeId);
    exigir(de && de.id !== ini.id && !noRaia(dados, de, 'can'), 'Escolha o projeto do qual este depende.');
    exigir(n.descricao.trim().length >= 3, 'Diga o que este projeto precisa receber.');
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(n.precisaAte), 'Informe até quando precisa.');
    await db.insert(t.dependencias).values({ orgId: dados.org.id, iniciativaId: ini.id, dependeDeId: de.id, descricao: n.descricao.trim(), precisaAte: n.precisaAte, criadoPor: eu.id });
    await notificar(dados.org.id, [de.gpId].filter((x) => x !== eu.id), `${ini.titulo} depende de "${n.descricao.trim()}" de ${de.titulo} até ${n.precisaAte.split('-').reverse().join('/')}.`, de.inicioProjeto ? `/projetos/${de.id}#dependencias` : undefined);
    return { ok: true, msg: 'Dependência registrada. O GP do outro projeto foi avisado.' };
  });
}

export async function removerDependencia(id: string) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const x = dados.dependencias.find((y) => y.id === id);
    exigir(x, 'Dependência não encontrada.');
    const ini = dados.iniciativas.find((i) => i.id === x.iniciativaId);
    exigir(ehPmo || ini?.gpId === eu.id, 'Só o gerente do projeto que depende ou o PMO podem remover.');
    await db.delete(t.dependencias).where(eq(t.dependencias.id, id));
    return { ok: true, msg: 'Dependência removida.' };
  });
}
