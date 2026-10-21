'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { acoesDoCard, podeConfirmar, validarGate, type TipoAcao } from '@/lib/regras/esteira';
import { fasesDoModelo } from '@/lib/regras/projeto';
import { segundaDaSemana } from '@/lib/regras/datas';
import { chaveDaRaia } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

type Extras = { gpId?: string; modeloId?: string; inicio?: string; motivo?: string; retomada?: string };

/** Move um card pela esteira: valida transição, permissão e critérios no servidor. */
export async function moverCard(input: { iniciativaId: string; tipo: TipoAcao; paraRaiaId: string; marcados: boolean[]; extras?: Extras }) {
  return executar(async () => {
    const ctx = await contexto();
    const { dados, eu, autoria, ehPmo } = ctx;
    const ini = dados.iniciativas.find((i) => i.id === input.iniciativaId);
    exigir(ini, 'Iniciativa não encontrada.');

    const acoes = acoesDoCard(ini, dados.raias);
    const acao = [acoes.primaria, acoes.secundaria, acoes.cancelar].find((a) => a && a.tipo === input.tipo && a.paraRaiaId === input.paraRaiaId);
    exigir(acao, 'Este card mudou de etapa. Atualize a página.');

    exigir(podeConfirmar(acao.aprovador, {
      ehPmo,
      ehSolicitante: ini.solicitanteId === eu.id,
      ehAprovador: ini.aprovadorId === eu.id,
      ehGp: ini.gpId === eu.id,
      ehPatrocinador: ini.patrocinadorId === eu.id,
    }), `Quem confirma esta passagem: ${acao.aprovador}.`);

    const gate = validarGate(acao.criterios, input.marcados);
    exigir(gate.ok, gate.mensagem);

    const agora = new Date();
    const ex = input.extras ?? {};
    const destino = chaveDaRaia(dados, acao.paraRaiaId);
    const upd: Partial<typeof t.iniciativas.$inferInsert> = { updatedAt: agora, progressoGates: { ...ini.progressoGates, [acao.gateKey]: input.marcados } };
    let aviso = '';

    if (acao.tipo === 'aprovar_gestor') {
      Object.assign(upd, { solStatus: 'aguardando_pmo', aprovadaGestorEm: agora, situacao: null });
      aviso = `"${ini.titulo}" foi aprovada pelo gestor e segue para o PMO.`;
    } else if (acao.tipo === 'pausar') {
      exigir(ex.motivo, 'Escolha o motivo da pausa.');
      exigir(ex.retomada, 'Informe a data prevista de retomada.');
      Object.assign(upd, { raiaId: acao.paraRaiaId, motivoSaida: ex.motivo, situacao: ex.motivo, retomadaPrevista: ex.retomada, pausadaEm: agora });
      aviso = `"${ini.titulo}" foi pausado: ${ex.motivo}.`;
    } else if (acao.tipo === 'retomar') {
      Object.assign(upd, { raiaId: acao.paraRaiaId, situacao: null, motivoSaida: null, retomadaPrevista: null });
      aviso = `"${ini.titulo}" foi retomado.`;
    } else if (acao.tipo === 'cancelar') {
      exigir(ex.motivo, 'Escolha o motivo.');
      Object.assign(upd, { raiaId: acao.paraRaiaId, motivoSaida: ex.motivo, situacao: null, solStatus: null, canceladaEm: agora });
      aviso = `"${ini.titulo}" saiu da esteira. Motivo: ${ex.motivo}.`;
    } else {
      // avançar para a próxima raia
      Object.assign(upd, { raiaId: acao.paraRaiaId, solStatus: null });
      if (destino === 'bkl') Object.assign(upd, { prioridade: ini.prioridade ?? 'Média', situacao: 'Aguardando priorização', classificadaEm: agora });
      else if (destino === 'pre') Object.assign(upd, { situacao: 'Área complementando informações', preAprovadaEm: agora });
      else if (destino === 'con') Object.assign(upd, { situacao: null, concluidaEm: agora });
      else if (destino === 'exe') {
        exigir(ex.gpId, 'Escolha o gerente de projeto.');
        exigir(ex.modeloId, 'Escolha o modelo de projeto.');
        exigir(ex.inicio, 'Informe a data de início.');
        const modelo = dados.modelos.find((m) => m.id === ex.modeloId);
        exigir(modelo, 'Modelo não encontrado.');
        const gp = dados.pessoas.find((p) => p.id === ex.gpId);
        exigir(gp, 'Gerente de projeto não encontrado.');
        const inicio = segundaDaSemana(ex.inicio);
        Object.assign(upd, { gpId: gp.id, modeloId: modelo.id, inicioProjeto: inicio, farol: 'ok', situacao: null, playEm: agora });
        const bib = modelo.fases.map((id) => dados.fasesBiblioteca.find((f) => f.id === id)).filter(Boolean) as typeof dados.fasesBiblioteca;
        const novas = fasesDoModelo(bib);
        await db.transaction(async (tx) => {
          await tx.delete(t.projetoFases).where(eq(t.projetoFases.iniciativaId, ini.id));
          if (novas.length) await tx.insert(t.projetoFases).values(novas.map((f) => ({ ...f, iniciativaId: ini.id })));
          if (!gp.perfis.includes('gp')) await tx.update(t.pessoas).set({ perfis: [...gp.perfis, 'gp'] }).where(eq(t.pessoas.id, gp.id));
        });
        await notificar(dados.org.id, [gp.id], `Você é o gerente do projeto "${ini.titulo}". O cronograma começou.`, `/projetos/${ini.id}`);
      } else Object.assign(upd, { situacao: null });
      const nomeDestino = dados.raias.find((r) => r.id === acao.paraRaiaId)?.nome;
      aviso = `"${ini.titulo}" avançou para ${nomeDestino}.`;
    }

    await db.update(t.iniciativas).set(upd).where(and(eq(t.iniciativas.id, ini.id), eq(t.iniciativas.orgId, dados.org.id)));
    await db.insert(t.transicoes).values({
      orgId: dados.org.id, iniciativaId: ini.id, acao: acao.tipo, deRaiaId: ini.raiaId, paraRaiaId: acao.paraRaiaId,
      criterios: acao.criterios.map((c, i) => ({ ...c, marcado: !!input.marcados[i] })), motivo: ex.motivo ?? null, ...autoria,
    });
    await notificar(dados.org.id, [ini.solicitanteId], aviso, '/inicio');
    return { ok: true };
  });
}

/** Guarda as marcações do checklist de um gate (alimenta a "Prontidão N/5"). */
export async function salvarProgressoGate(iniciativaId: string, gateKey: string, marcados: boolean[]) {
  return executar(async () => {
    const { dados, ehPmo } = await contexto();
    exigir(ehPmo, 'Apenas o PMO pode preparar este gate.');
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini, 'Iniciativa não encontrada.');
    await db.update(t.iniciativas).set({ progressoGates: { ...ini.progressoGates, [gateKey]: marcados } }).where(eq(t.iniciativas.id, ini.id));
  });
}
