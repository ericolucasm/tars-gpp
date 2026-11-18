'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { ATINGIDO, podeMedirBeneficio, validarMedicao } from '@/lib/regras/beneficios';
import { contexto, executar, exigir, notificar } from './_ctx';

/** GP ou PMO define/ajusta o benefício (indicador, meta, quando medir). */
export async function definirBeneficio(iniciativaId: string, b: { indicador: string; meta: string; medirEm: string }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini, 'Iniciativa não encontrada.');
    exigir(ehPmo || ini.gpId === eu.id, 'Só o gerente do projeto ou o PMO podem ajustar o benefício.');
    exigir(b.indicador.trim().length >= 3, 'Diga qual indicador vai mostrar o resultado.');
    exigir(b.meta.trim().length >= 1, 'Informe a meta.');
    exigir(/^\d{4}-\d{2}-\d{2}$/.test(b.medirEm), 'Informe quando medir.');
    await db.update(t.iniciativas).set({ beneficioIndicador: b.indicador.trim(), beneficioMeta: b.meta.trim(), beneficioMedirEm: b.medirEm, updatedAt: new Date() }).where(eq(t.iniciativas.id, ini.id));
    return { ok: true, msg: 'Benefício atualizado.' };
  });
}

/** Registra o resultado medido. Pode: quem pediu, o gestor que aprovou, o GP ou o PMO. */
export async function registrarMedicao(iniciativaId: string, m: { resultado: string; atingido: string }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && ini.beneficioIndicador, 'Esta iniciativa não tem benefício definido.');
    exigir(podeMedirBeneficio(ini, eu.id, ehPmo), 'Só quem pediu, o gestor, o GP ou o PMO podem registrar o resultado.');
    const erro = validarMedicao(m);
    exigir(!erro, erro ?? '');
    await db.update(t.iniciativas).set({ beneficioResultado: m.resultado.trim(), beneficioAtingido: m.atingido, beneficioMedidoEm: new Date(), beneficioMedidoPor: eu.id, updatedAt: new Date() }).where(eq(t.iniciativas.id, ini.id));
    await notificar(dados.org.id, [ini.solicitanteId, ini.gpId, ...dados.pessoas.filter((p) => p.perfis.includes('pmo')).map((p) => p.id)].filter((x) => x !== eu.id),
      `Resultado de ${ini.titulo}: ${m.resultado.trim()} (${ATINGIDO[m.atingido].toLowerCase()}).`, '/beneficios');
    return { ok: true, msg: 'Resultado registrado.' };
  });
}
