'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { aprovadorDe, chaveDaRaia, cicloAberto, raiaChave } from '@/lib/visoes';
import { retiradaPermitida, validarRetirada } from '@/lib/regras/esteira';
import { patrocinadorValido } from '@/lib/regras/pessoas';
import { contexto, executar, exigir, notificar } from './_ctx';

export type DadosForm = {
  id?: string;
  titulo: string; problema: string; resultadoEsperado: string; tipo: string;
  patrocinadorTexto: string; patrocinadorId?: string; areasImpactadas: string[];
  urgencia: string; justificativaUrgencia: string;
  inicioDesejado: string; entregaDesejada: string; faixaCusto: string; fornecedor: string;
  beneficioIndicador: string; beneficioMeta: string; beneficioMedirEm: string;
};

/** Cria ou atualiza uma iniciativa. enviar=false grava rascunho; enviar=true manda para o gestor. */
export async function salvarIniciativa(f: DadosForm, enviar: boolean) {
  let novoId = f.id ?? '';
  const r = await executar(async () => {
    const { dados, eu } = await contexto();
    if (enviar) {
      exigir(f.titulo.trim(), 'Dê um título para a iniciativa');
      exigir(f.problema.trim(), 'Conte qual é o problema ou a oportunidade');
      exigir(['est', 'mel', 'obr', 'man'].includes(f.tipo), 'Escolha o tipo');
    } else {
      exigir(f.titulo.trim(), 'Dê um título para salvar o rascunho');
    }
    const sol = raiaChave(dados, 'sol');
    exigir(sol, 'A raia de solicitações não está configurada.');

    const patroId = f.patrocinadorId || null;
    exigir(!patroId || patrocinadorValido(dados.pessoas.find((p) => p.id === patroId)), 'Escolha um patrocinador da lista.');
    const aprovador = aprovadorDe(dados, eu);
    const ciclo = cicloAberto(dados);
    const agora = new Date();
    const campos = {
      titulo: f.titulo.trim(), problema: f.problema.trim(), resultadoEsperado: f.resultadoEsperado.trim(), tipo: f.tipo || 'mel',
      patrocinadorId: patroId, patrocinadorTexto: patroId ? null : f.patrocinadorTexto.trim() || null, areasImpactadas: f.areasImpactadas,
      urgencia: f.urgencia, justificativaUrgencia: f.urgencia === 'urg' ? f.justificativaUrgencia.trim() || null : null,
      inicioDesejado: f.inicioDesejado || null, entregaDesejada: f.entregaDesejada || null, faixaCusto: f.faixaCusto, fornecedor: f.fornecedor,
      beneficioIndicador: f.beneficioIndicador?.trim() || null, beneficioMeta: f.beneficioMeta?.trim() || null, beneficioMedirEm: /^\d{4}-\d{2}-\d{2}$/.test(f.beneficioMedirEm ?? '') ? f.beneficioMedirEm : null,
      cicloId: f.urgencia === 'urg' ? null : ciclo?.id ?? null,
      aprovadorId: aprovador, areaId: eu.areaId, updatedAt: agora,
    };
    const status = !enviar ? 'rascunho' : aprovador ? 'aguardando_gestor' : 'aguardando_pmo';
    const envio = enviar ? { enviadaEm: agora, devolucaoNota: null, ...(aprovador ? {} : { aprovadaGestorEm: agora }) } : {};

    if (f.id) {
      const atual = dados.iniciativas.find((i) => i.id === f.id);
      exigir(atual && atual.solicitanteId === eu.id, 'Só quem enviou pode editar esta iniciativa.');
      exigir(atual.raiaId === sol.id && ['rascunho', 'devolvida'].includes(atual.solStatus ?? ''), 'Esta iniciativa já está em avaliação e não pode mais ser editada.');
      await db.update(t.iniciativas).set({ ...campos, solStatus: status, ...envio }).where(and(eq(t.iniciativas.id, f.id), eq(t.iniciativas.orgId, dados.org.id)));
    } else {
      const [row] = await db.insert(t.iniciativas).values({ orgId: dados.org.id, solicitanteId: eu.id, raiaId: sol.id, solStatus: status, ...campos, ...envio }).returning({ id: t.iniciativas.id });
      novoId = row.id;
    }
    if (enviar && aprovador) await notificar(dados.org.id, [aprovador], `${eu.nome} enviou "${campos.titulo}" para sua aprovação.`, '/area/iniciativas');
  });
  return { ...r, id: novoId };
}

/** Quem pediu desiste da iniciativa: rascunho é excluído; devolvida ou com o gestor vai para Cancelados com o motivo. */
export async function retirarIniciativa(iniciativaId: string, comentario: string) {
  return executar(async () => {
    const { dados, eu, autoria } = await contexto();
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini, 'Iniciativa não encontrada.');
    exigir(ini.solicitanteId === eu.id, 'Só quem pediu pode retirar esta iniciativa.');
    const tipo = retiradaPermitida(chaveDaRaia(dados, ini.raiaId), ini.solStatus);
    exigir(tipo, 'Esta iniciativa já foi aprovada pelo gestor. Para cancelar, fale com o PMO.');
    const erro = validarRetirada(tipo, comentario);
    exigir(!erro, erro ?? '');
    if (tipo === 'excluir') {
      await db.delete(t.iniciativas).where(and(eq(t.iniciativas.id, ini.id), eq(t.iniciativas.orgId, dados.org.id)));
      return { ok: true, msg: `Rascunho “${ini.titulo}” excluído.` };
    }
    const can = raiaChave(dados, 'can');
    exigir(can, 'A etapa de cancelados não está configurada.');
    const agora = new Date();
    const motivoSaida = `Retirada por quem pediu — ${comentario.trim()}`;
    await db.update(t.iniciativas).set({ raiaId: can.id, solStatus: null, motivoSaida, situacao: null, canceladaEm: agora, updatedAt: agora }).where(eq(t.iniciativas.id, ini.id));
    await db.insert(t.transicoes).values({ orgId: dados.org.id, iniciativaId: ini.id, acao: 'retirada_solicitante', deRaiaId: ini.raiaId, paraRaiaId: can.id, motivo: motivoSaida, ...autoria });
    if (ini.solStatus === 'aguardando_gestor') await notificar(dados.org.id, [ini.aprovadorId], `${eu.nome} retirou "${ini.titulo}": ${comentario.trim()}`, '/area/iniciativas');
    return { ok: true, msg: `“${ini.titulo}” retirada.` };
  });
}

/** PMO indica ou troca o patrocinador (pessoa cadastrada) de uma iniciativa ou projeto. */
export async function definirPatrocinador(iniciativaId: string, pessoaId: string) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    exigir(ehPmo, 'Apenas o PMO pode trocar o patrocinador.');
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini, 'Iniciativa não encontrada.');
    const novo = pessoaId ? dados.pessoas.find((p) => p.id === pessoaId) : null;
    exigir(!pessoaId || patrocinadorValido(novo), 'Escolha um patrocinador da lista.');
    await db.update(t.iniciativas).set({ patrocinadorId: novo?.id ?? null, ...(novo ? { patrocinadorTexto: null } : {}), updatedAt: new Date() }).where(and(eq(t.iniciativas.id, ini.id), eq(t.iniciativas.orgId, dados.org.id)));
    if (novo && novo.id !== ini.patrocinadorId && novo.id !== eu.id) await notificar(dados.org.id, [novo.id], `Você é o patrocinador de "${ini.titulo}".`, ini.inicioProjeto ? `/projetos/${ini.id}` : '/inicio');
    return { ok: true, msg: novo ? `Patrocinador: ${novo.nome}.` : 'Patrocinador removido.' };
  });
}
