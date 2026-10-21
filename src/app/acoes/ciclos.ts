'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { addDias } from '@/lib/regras/datas';
import { numerosAoVivo } from '@/lib/ciclo-vm';
import { subarvore } from '@/lib/regras/pessoas';
import { contexto, executar, exigir, exigirPmo, notificar } from './_ctx';

export type CamposCiclo = {
  abertura: string; fechamento: string; avaliacaoAte: string; comunicarAte: string; orcamentoRef: number;
  publico: string; areasPublico: string[]; avisoAbertura: boolean; avisoLembrete: boolean; avisoCobranca: boolean;
};

export async function salvarCiclo(id: string, c: CamposCiclo) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const ciclo = ctx.dados.ciclos.find((x) => x.id === id);
    exigir(ciclo && ciclo.etapa !== 'encerrado', 'Ciclos encerrados não podem ser alterados.');
    exigir(c.abertura && c.fechamento && c.avaliacaoAte && c.comunicarAte, 'Preencha todas as datas.');
    exigir(c.abertura < c.fechamento && c.fechamento <= c.avaliacaoAte && c.avaliacaoAte <= c.comunicarAte, 'As datas precisam seguir a ordem: abertura, fechamento, avaliação, comunicação.');
    exigir(Number.isFinite(c.orcamentoRef) && c.orcamentoRef >= 0, 'Informe um orçamento válido.');
    await db.update(t.ciclos).set({ ...c, areasPublico: c.publico === 'selecionadas' ? c.areasPublico : [] }).where(and(eq(t.ciclos.id, id), eq(t.ciclos.orgId, ctx.dados.org.id)));
    return { ok: true, msg: 'Configuração do ciclo salva.' };
  });
}

/** Avança o ciclo de etapa: planejado → inscrições → avaliação → (comunicado pela Avaliação) → encerrado. */
export async function mudarEtapa(id: string, para: 'inscricoes' | 'avaliacao' | 'encerrado') {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const { dados } = ctx;
    const ciclo = dados.ciclos.find((x) => x.id === id);
    exigir(ciclo, 'Ciclo não encontrado.');
    if (para === 'inscricoes') {
      exigir(ciclo.etapa === 'planejado', 'Só um ciclo planejado pode abrir inscrições.');
      exigir(!dados.ciclos.some((c) => c.id !== id && ['inscricoes', 'avaliacao', 'comunicado'].includes(c.etapa)), 'Encerre o ciclo em andamento antes de abrir outro.');
      await db.update(t.ciclos).set({ etapa: 'inscricoes' }).where(eq(t.ciclos.id, id));
      if (ciclo.avisoAbertura) {
        const responsaveis = dados.areas.filter((a) => ciclo.publico === 'todas' || ciclo.areasPublico.includes(a.id)).map((a) => a.responsavelId);
        await notificar(dados.org.id, responsaveis, `Inscrições abertas: ${ciclo.nome}. Envie as iniciativas da sua área.`, '/iniciativas/nova');
      }
      return { ok: true, msg: 'Inscrições abertas.' };
    }
    if (para === 'avaliacao') {
      exigir(ciclo.etapa === 'inscricoes', 'O ciclo não está com inscrições abertas.');
      await db.update(t.ciclos).set({ etapa: 'avaliacao' }).where(eq(t.ciclos.id, id));
      return { ok: true, msg: 'Inscrições encerradas. O ciclo está em avaliação.' };
    }
    exigir(ciclo.etapa === 'comunicado' || ciclo.etapa === 'avaliacao', 'Comunique as decisões antes de encerrar o ciclo.');
    const n = numerosAoVivo(dados, ciclo);
    await db.update(t.ciclos).set({ etapa: 'encerrado', snapshot: {
      recebidas: n.recebidas, preAprovadas: n.preAprovadas, viraramProjeto: n.viraramProjeto, backlog: n.backlog, recusadas: n.recusadas, comprometido: n.comprometido, motivosRecusa: n.motivosRecusa,
    } }).where(eq(t.ciclos.id, id));
    return { ok: true, msg: 'Ciclo encerrado. Os números foram congelados.' };
  });
}

/** Cria o próximo ciclo (planejado) copiando a janela do último, um ano depois. */
export async function novoCiclo() {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const { dados } = ctx;
    exigir(!dados.ciclos.some((c) => c.etapa === 'planejado'), 'Já existe um ciclo planejado. Abra as inscrições dele primeiro.');
    const ult = dados.ciclos.slice().sort((a, b) => b.ano - a.ano)[0];
    const ano = (ult?.ano ?? new Date().getFullYear()) + 1;
    const mais1 = (iso: string | undefined, padrao: string) => (iso ? addDias(iso, 364) : padrao);
    await db.insert(t.ciclos).values({
      orgId: dados.org.id, nome: `Planejamento ${ano}`, ano, descricao: `Iniciativas para executar a partir de janeiro de ${ano}`,
      abertura: mais1(ult?.abertura, `${ano - 1}-09-01`), fechamento: mais1(ult?.fechamento, `${ano - 1}-10-31`),
      avaliacaoAte: mais1(ult?.avaliacaoAte, `${ano - 1}-11-20`), comunicarAte: mais1(ult?.comunicarAte, `${ano - 1}-12-04`),
      playAPartir: 'a partir de jan.', orcamentoRef: ult?.orcamentoRef ?? 0, etapa: 'planejado',
    });
    return { ok: true, msg: `Ciclo Planejamento ${ano} criado. Revise a janela e abra as inscrições.` };
  });
}

/** Lembra as áreas que ainda não enviaram iniciativas. */
export async function enviarLembrete(id: string) {
  return executar(async () => {
    const ctx = await contexto();
    exigirPmo(ctx);
    const { dados } = ctx;
    const ciclo = dados.ciclos.find((x) => x.id === id);
    exigir(ciclo && ciclo.etapa === 'inscricoes', 'O ciclo não está com inscrições abertas.');
    const sem = dados.areas.filter((g) => g.tipo === 'Gerência' && g.nome !== 'PMO').filter((g) => {
      const sub = new Set(subarvore(g.id, dados.areas));
      return !dados.iniciativas.some((i) => i.cicloId === id && i.enviadaEm && i.areaId && sub.has(i.areaId));
    });
    await notificar(dados.org.id, sem.map((a) => a.responsavelId), `Lembrete: as inscrições do ${ciclo.nome} vão até ${ciclo.fechamento.split('-').reverse().join('/')}.`, '/iniciativas/nova');
    return { ok: true, msg: `Lembrete enviado para ${sem.length} ${sem.length === 1 ? 'área' : 'áreas'}.` };
  });
}
