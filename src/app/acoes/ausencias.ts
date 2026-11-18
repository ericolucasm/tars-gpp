'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { gestorDe } from '@/lib/regras/pessoas';
import { br, hojeISO } from '@/lib/regras/datas';
import { validarAusencia } from '@/lib/regras/ausencias';
import { conflitosDeAusencia, pessoa, representados } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

/** Gestor registra uma ausência (férias, licença…) de alguém do time. Os GPs dos projetos em que a pessoa está alocada no período são avisados. */
export async function registrarAusencia(pessoaId: string, a: { inicio: string; fim: string; motivo: string }) {
  return executar(async () => {
    const { dados, eu, sessao } = await contexto();
    const p = pessoa(dados, pessoaId);
    exigir(p, 'Pessoa não encontrada.');
    exigir(representados(dados, eu.id, hojeISO()).has(gestorDe(p, dados.areas) ?? '') || sessao.admin, 'Só o gestor da pessoa registra a ausência dela.');
    const hoje = hojeISO();
    const erro = validarAusencia(a, hoje);
    exigir(!erro, erro ?? '');
    const [nova] = await db.insert(t.ausencias).values({ orgId: dados.org.id, pessoaId: p.id, inicio: a.inicio, fim: a.fim, motivo: a.motivo, registradaPor: eu.id }).returning();
    const conflitos = conflitosDeAusencia({ ...dados, ausencias: [nova] }, hoje);
    const porGp = new Map<string, string[]>();
    for (const c of conflitos) if (c.projeto.gpId) porGp.set(c.projeto.gpId, [...(porGp.get(c.projeto.gpId) ?? []), `${c.projeto.titulo} (${c.fase})`]);
    for (const [gp, projs] of porGp) {
      await notificar(dados.org.id, [gp], `${p.nome} estará ausente (${a.motivo.toLowerCase()}) de ${br(a.inicio)} a ${br(a.fim)} e está alocado(a) em ${[...new Set(projs)].join(', ')}.`, '/inicio');
    }
    const n = new Set(conflitos.map((c) => c.projeto.id)).size;
    return { ok: true, msg: `Ausência de ${p.nome} registrada.${n ? ` ${n === 1 ? 'O GP do projeto afetado foi avisado' : `Os GPs dos ${n} projetos afetados foram avisados`}.` : ''}` };
  });
}

export async function removerAusencia(id: string) {
  return executar(async () => {
    const { dados, eu, sessao } = await contexto();
    const a = dados.ausencias.find((x) => x.id === id);
    exigir(a, 'Ausência não encontrada.');
    const p = pessoa(dados, a.pessoaId);
    exigir(p && (representados(dados, eu.id, hojeISO()).has(gestorDe(p, dados.areas) ?? '') || sessao.admin), 'Só o gestor da pessoa remove a ausência dela.');
    await db.delete(t.ausencias).where(eq(t.ausencias.id, id));
    return { ok: true, msg: 'Ausência removida.' };
  });
}
