'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { CADENCIAS, validarPedidoPrazo } from '@/lib/regras/muro';
import { dataDaSemana } from '@/lib/regras/projeto';
import { diffDias, br } from '@/lib/regras/datas';
import { nivelDoRisco, validarRisco } from '@/lib/regras/riscos';
import { participaDoProjeto } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

async function ctxGpOuPmo(iniciativaId: string) {
  const ctx = await contexto();
  const ini = ctx.dados.iniciativas.find((i) => i.id === iniciativaId);
  exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
  exigir(ini.gpId === ctx.eu.id || ctx.ehPmo, 'Só o gerente do projeto ou o PMO podem mudar isto.');
  return { ...ctx, ini };
}

/** GP/PMO combinam a cadência do status report. */
export async function definirCadencia(iniciativaId: string, cadencia: string, dia: number) {
  return executar(async () => {
    const { ini } = await ctxGpOuPmo(iniciativaId);
    exigir(CADENCIAS[cadencia] && dia >= 1 && dia <= 5, 'Escolha a frequência e o dia da semana.');
    await db.update(t.iniciativas).set({ statusCadencia: cadencia, statusDia: dia, updatedAt: new Date() }).where(eq(t.iniciativas.id, ini.id));
    return { ok: true, msg: 'Cadência do status atualizada.' };
  });
}

/** GP/PMO definem quem responde pela fase (quem confirma o fim dela na data). */
export async function definirResponsavelFase(faseId: string, pessoaId: string | null) {
  return executar(async () => {
    const ctx0 = await contexto();
    const f = ctx0.dados.fases.find((x) => x.id === faseId);
    exigir(f, 'Fase não encontrada.');
    const { dados, ini } = await ctxGpOuPmo(f.iniciativaId);
    exigir(!pessoaId || dados.pessoas.some((p) => p.id === pessoaId), 'Pessoa inválida.');
    await db.update(t.projetoFases).set({ responsavelId: pessoaId || null }).where(eq(t.projetoFases.id, faseId));
    if (pessoaId) await notificar(dados.org.id, [pessoaId], `Você é responsável pela fase ${f.nome} de ${ini.titulo}.`, '/minhas-entregas');
    return { ok: true, msg: 'Responsável da fase atualizado.' };
  });
}

/** Quem responde por uma tarefa ou fase pede mais prazo. O GP decide. */
export async function pedirPrazo(tipo: 'tarefa' | 'fase', alvoId: string, p: { novoPrazo: string; motivo: string }) {
  return executar(async () => {
    const { dados, eu, hoje } = await contexto();
    let iniId = '', atual: string | null = null, resp: string | null = null, nome = '';
    if (tipo === 'tarefa') {
      const tf = dados.tarefas.find((x) => x.id === alvoId);
      exigir(tf, 'Tarefa não encontrada.');
      iniId = tf.iniciativaId; atual = tf.prazo; resp = tf.responsavelId; nome = tf.titulo;
    } else {
      const f = dados.fases.find((x) => x.id === alvoId);
      const ini = f && dados.iniciativas.find((i) => i.id === f.iniciativaId);
      exigir(f && ini?.inicioProjeto, 'Fase não encontrada.');
      iniId = f.iniciativaId; atual = dataDaSemana(ini.inicioProjeto, f.inicioSemana + f.duracao); resp = f.responsavelId ?? ini.gpId; nome = `fase ${f.nome}`;
    }
    const ini = dados.iniciativas.find((i) => i.id === iniId)!;
    exigir(resp === eu.id || ini.gpId === eu.id, 'Só quem é responsável pode pedir mais prazo.');
    const erro = validarPedidoPrazo(p, atual, hoje);
    exigir(!erro, erro ?? '');
    exigir(!dados.pedidosPrazo.some((x) => x.tipo === tipo && x.alvoId === alvoId && x.status === 'pendente'), 'Já existe um pedido de prazo aguardando o GP.');
    await db.insert(t.pedidosPrazo).values({ orgId: dados.org.id, iniciativaId: iniId, tipo, alvoId, prazoAtual: atual, novoPrazo: p.novoPrazo, motivo: p.motivo.trim(), solicitanteId: eu.id });
    await notificar(dados.org.id, [ini.gpId].filter((x) => x !== eu.id), `${eu.nome} pede mais prazo para ${nome} (${ini.titulo}): até ${br(p.novoPrazo)}.`, `/projetos/${iniId}#prazos`);
    return { ok: true, msg: 'Pedido de mais prazo enviado ao GP.' };
  });
}

/** GP (ou PMO) aprova ou recusa. Aprovado: a tarefa ganha o novo prazo; a fase é estendida até a nova data. */
export async function decidirPrazo(id: string, aprovar: boolean) {
  return executar(async () => {
    const ctx0 = await contexto();
    const ped = ctx0.dados.pedidosPrazo.find((x) => x.id === id);
    exigir(ped && ped.status === 'pendente', 'Este pedido já foi decidido.');
    const { dados, eu, ini } = await ctxGpOuPmo(ped.iniciativaId);
    await db.transaction(async (tx) => {
      await tx.update(t.pedidosPrazo).set({ status: aprovar ? 'aprovado' : 'recusado', decididoPor: eu.id, decididoEm: new Date() }).where(eq(t.pedidosPrazo.id, id));
      if (!aprovar) return;
      if (ped.tipo === 'tarefa') await tx.update(t.tarefas).set({ prazo: ped.novoPrazo }).where(eq(t.tarefas.id, ped.alvoId));
      else {
        const f = dados.fases.find((x) => x.id === ped.alvoId);
        if (f) {
          const semanas = Math.max(f.duracao, Math.ceil(diffDias(ped.novoPrazo, dataDaSemana(ini.inicioProjeto!, f.inicioSemana)) / 7));
          await tx.update(t.projetoFases).set({ duracao: semanas }).where(eq(t.projetoFases.id, f.id));
        }
      }
    });
    await notificar(dados.org.id, [ped.solicitanteId], `${eu.nome} ${aprovar ? 'aprovou' : 'recusou'} seu pedido de mais prazo (até ${br(ped.novoPrazo)}).`, '/minhas-entregas');
    return { ok: true, msg: aprovar ? 'Prazo estendido.' : 'Pedido de prazo recusado.' };
  });
}

/** Quem participa do projeto informa um risco numa fase (o GP completa a avaliação depois, se precisar). */
export async function informarRisco(faseId: string, r: { nome: string; probabilidade: number; impacto: number; plano: string }) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const f = dados.fases.find((x) => x.id === faseId);
    exigir(f, 'Fase não encontrada.');
    exigir(ehPmo || participaDoProjeto(dados, f.iniciativaId, eu.id), 'Só quem participa do projeto pode informar riscos.');
    const erro = validarRisco(r);
    exigir(!erro, erro ?? '');
    await db.insert(t.riscos).values({ faseId, nome: r.nome.trim(), probabilidade: r.probabilidade, impacto: r.impacto, nivel: nivelDoRisco(r.probabilidade, r.impacto), responsavelId: eu.id, plano: r.plano.trim() });
    const ini = dados.iniciativas.find((i) => i.id === f.iniciativaId);
    await notificar(dados.org.id, [ini?.gpId].filter((x) => x !== eu.id), `${eu.nome} informou um risco em ${ini?.titulo ?? ''}: ${r.nome.trim()}.`, `/projetos/${f.iniciativaId}`);
    return { ok: true, msg: 'Risco informado ao GP.' };
  });
}
