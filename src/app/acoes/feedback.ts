'use server';

import { db, schema as t } from '@/db';
import { validarFeedback, NIVEIS_FEEDBACK } from '@/lib/regras/feedback';
import { gestorDe } from '@/lib/regras/pessoas';
import { hojeISO } from '@/lib/regras/datas';
import { equipeParaFeedback, pessoa } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

/** O GP registra (ou atualiza) como foi a contribuição de uma pessoa cedida ao projeto. O gestor dela é avisado. */
export async function darFeedback(iniciativaId: string, pessoaId: string, nivel: string, comentario: string) {
  return executar(async () => {
    const { dados, eu } = await contexto();
    const proj = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(proj, 'Projeto não encontrado.');
    exigir(proj.gpId === eu.id, 'Só o GP do projeto avalia a contribuição da equipe.');
    exigir(equipeParaFeedback(dados, proj, hojeISO()).some((x) => x.pessoa.id === pessoaId), 'Essa pessoa não trabalhou neste projeto.');
    const erro = validarFeedback(nivel, comentario);
    exigir(!erro, erro ?? '');
    const agora = new Date();
    await db.insert(t.feedbacks).values({ orgId: dados.org.id, iniciativaId, pessoaId, autorId: eu.id, nivel, comentario: comentario.trim() })
      .onConflictDoUpdate({ target: [t.feedbacks.iniciativaId, t.feedbacks.pessoaId], set: { nivel, comentario: comentario.trim(), autorId: eu.id, updatedAt: agora } });
    const p = pessoa(dados, pessoaId)!;
    const g = gestorDe(p, dados.areas);
    if (g) await notificar(dados.org.id, [g], `${eu.nome} avaliou a contribuição de ${p.nome} em ${proj.titulo}: ${NIVEIS_FEEDBACK[nivel].rotulo.toLowerCase()}.`, '/area/time');
    return { ok: true, msg: `Feedback de ${p.nome} registrado. O gestor da pessoa foi avisado.` };
  });
}
