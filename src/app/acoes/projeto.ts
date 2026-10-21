'use server';

import { contexto, executar, exigirPmo, notificar } from './_ctx';

/** PMO cobra o status da semana dos GPs dos projetos indicados. */
export async function cobrarStatus(iniciativaIds: string[]) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    for (const id of iniciativaIds) {
      const ini = ctx.dados.iniciativas.find((i) => i.id === id);
      if (ini?.gpId) await notificar(ctx.dados.org.id, [ini.gpId], `O PMO pediu o status da semana de "${ini.titulo}".`, `/projetos/${ini.id}#status`);
    }
    return { ok: true, msg: 'GPs avisados.' };
  });
}
