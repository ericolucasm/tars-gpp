'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { validarLicao } from '@/lib/regras/encerramento';
import { participaDoProjeto } from '@/lib/visoes';
import { contexto, executar, exigir } from './_ctx';

/** Registra uma lição aprendida. Pode: quem participa do projeto (GP, alocados, responsáveis de tarefa) ou o PMO. */
export async function registrarLicao(iniciativaId: string, l: { tipo: string; texto: string }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
    exigir(ehPmo || participaDoProjeto(dados, ini.id, eu.id), 'Só quem participa do projeto ou o PMO pode registrar lições.');
    const erro = validarLicao(l);
    exigir(!erro, erro ?? '');
    await db.insert(t.licoes).values({ orgId: dados.org.id, iniciativaId: ini.id, tipo: l.tipo, texto: l.texto.trim(), autorId: eu.id });
    return { ok: true, msg: 'Lição registrada.' };
  });
}

export async function removerLicao(id: string) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const l = dados.licoes.find((x) => x.id === id);
    exigir(l, 'Lição não encontrada.');
    exigir(ehPmo || l.autorId === eu.id, 'Só quem escreveu ou o PMO pode remover.');
    await db.delete(t.licoes).where(eq(t.licoes.id, id));
    return { ok: true, msg: 'Lição removida.' };
  });
}
