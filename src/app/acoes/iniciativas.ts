'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { aprovadorDe, cicloAberto, raiaChave } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

export type DadosForm = {
  id?: string;
  titulo: string; problema: string; resultadoEsperado: string; tipo: string;
  patrocinadorTexto: string; areasImpactadas: string[];
  urgencia: string; justificativaUrgencia: string;
  inicioDesejado: string; entregaDesejada: string; faixaCusto: string; fornecedor: string;
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

    const aprovador = aprovadorDe(dados, eu);
    const ciclo = cicloAberto(dados);
    const agora = new Date();
    const campos = {
      titulo: f.titulo.trim(), problema: f.problema.trim(), resultadoEsperado: f.resultadoEsperado.trim(), tipo: f.tipo || 'mel',
      patrocinadorTexto: f.patrocinadorTexto.trim() || null, areasImpactadas: f.areasImpactadas,
      urgencia: f.urgencia, justificativaUrgencia: f.urgencia === 'urg' ? f.justificativaUrgencia.trim() || null : null,
      inicioDesejado: f.inicioDesejado || null, entregaDesejada: f.entregaDesejada || null, faixaCusto: f.faixaCusto, fornecedor: f.fornecedor,
      cicloId: f.urgencia === 'urg' ? null : ciclo?.id ?? null,
      aprovadorId: aprovador, areaId: eu.areaId, updatedAt: agora,
    };
    const atual = f.id ? dados.iniciativas.find((i) => i.id === f.id) : undefined;
    // Ajuste pedido pelo PMO: o gestor já aprovou, então o reenvio volta direto para a avaliação do PMO, no mesmo ciclo.
    const voltaAoPmo = enviar && atual?.solStatus === 'devolvida' && atual.devolucaoOrigem === 'pmo';
    const status = !enviar ? 'rascunho' : voltaAoPmo || !aprovador ? 'aguardando_pmo' : 'aguardando_gestor';
    const envio = enviar ? { enviadaEm: agora, devolucaoNota: null, ...(aprovador && !voltaAoPmo ? {} : { aprovadaGestorEm: atual?.aprovadaGestorEm ?? agora }) } : {};
    const doCiclo = voltaAoPmo ? { cicloId: atual!.cicloId, aprovadorId: atual!.aprovadorId } : {};

    if (f.id) {
      exigir(atual && atual.solicitanteId === eu.id, 'Só quem enviou pode editar esta iniciativa.');
      exigir(atual.raiaId === sol.id && ['rascunho', 'devolvida'].includes(atual.solStatus ?? ''), 'Esta iniciativa já está em avaliação e não pode mais ser editada.');
      await db.update(t.iniciativas).set({ ...campos, ...doCiclo, solStatus: status, ...envio }).where(and(eq(t.iniciativas.id, f.id), eq(t.iniciativas.orgId, dados.org.id)));
    } else {
      const [row] = await db.insert(t.iniciativas).values({ orgId: dados.org.id, solicitanteId: eu.id, raiaId: sol.id, solStatus: status, ...campos, ...envio }).returning({ id: t.iniciativas.id });
      novoId = row.id;
    }
    if (voltaAoPmo) {
      const quem = atual!.devolvidaPorId ? [atual!.devolvidaPorId] : dados.pessoas.filter((p) => p.perfis.includes('pmo')).map((p) => p.id);
      await notificar(dados.org.id, quem, `${eu.nome} ajustou "${campos.titulo}" e reenviou para a avaliação.`, '/avaliacao');
    } else if (enviar && aprovador) await notificar(dados.org.id, [aprovador], `${eu.nome} enviou "${campos.titulo}" para sua aprovação.`, '/area#aprovacoes');
  });
  return { ...r, id: novoId };
}
