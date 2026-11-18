'use server';

import { eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import { podeResolverPonto, TIPOS_PONTO } from '@/lib/regras/pontos';
import { participaDoProjeto, pessoa } from '@/lib/visoes';
import { contexto, executar, exigir, notificar } from './_ctx';

export type NovoPonto = { tipo: string; titulo: string; descricao: string; destino: string; destinatarioId: string | null; prazo: string | null; faseId: string | null };

/** Abre um ponto de atenção no projeto. Pode: o PMO e quem participa do projeto (GP, alocados, responsáveis de tarefa). */
export async function abrirPonto(iniciativaId: string, n: NovoPonto) {
  // destino 'gp': impedimento de quem está na tarefa ou fase, para o GP do projeto
  return executar(async () => {
    const ctx = await contexto();
    const { dados, eu, ehPmo } = ctx;
    const ini = dados.iniciativas.find((i) => i.id === iniciativaId);
    exigir(ini && ini.inicioProjeto, 'Projeto não encontrado.');
    exigir(ehPmo || participaDoProjeto(dados, ini.id, eu.id), 'Só quem participa do projeto ou o PMO pode abrir um ponto de atenção.');
    exigir(TIPOS_PONTO[n.tipo], 'Escolha se é um impedimento ou uma decisão necessária.');
    exigir(n.titulo.trim().length >= 3, 'Descreva o ponto de atenção em poucas palavras.');
    exigir(n.destino === 'pmo' || n.destino === 'gestor' || n.destino === 'gp', 'Escolha para quem vai o ponto de atenção.');
    if (n.destino === 'gp') { exigir(ini.gpId, 'Este projeto ainda não tem GP.'); n = { ...n, destinatarioId: ini.gpId }; }
    if (n.destino === 'gestor') {
      const g = pessoa(dados, n.destinatarioId);
      exigir(g && g.perfis.includes('gestor'), 'Escolha o gestor que precisa decidir.');
    }
    exigir(!n.prazo || /^\d{4}-\d{2}-\d{2}$/.test(n.prazo), 'Data inválida.');
    exigir(!n.faseId || dados.fases.some((f) => f.id === n.faseId && f.iniciativaId === ini.id), 'Fase inválida.');
    await db.insert(t.pontosAtencao).values({
      orgId: dados.org.id, iniciativaId: ini.id, faseId: n.faseId || null, tipo: n.tipo, titulo: n.titulo.trim(), descricao: n.descricao.trim(),
      destino: n.destino, destinatarioId: n.destino === 'pmo' ? null : n.destinatarioId, prazo: n.prazo || null, abertoPor: eu.id,
    });
    const para = n.destino !== 'pmo' ? [n.destinatarioId] : dados.pessoas.filter((p) => p.perfis.includes('pmo')).map((p) => p.id);
    await notificar(dados.org.id, para, `${eu.nome} abriu um ponto de atenção em ${ini.titulo}: ${n.titulo.trim()}`, '/pontos');
    return { ok: true, msg: n.destino !== 'pmo' ? `Ponto de atenção enviado para ${pessoa(dados, n.destinatarioId)?.nome}.` : 'Ponto de atenção enviado ao PMO.' };
  });
}

/** Registra a resolução (decisão tomada ou impedimento removido). */
export async function resolverPonto(id: string, resolucao: string) {
  return executar(async () => {
    const { dados, eu, ehPmo } = await contexto();
    const p = dados.pontos.find((x) => x.id === id);
    exigir(p, 'Ponto de atenção não encontrado.');
    exigir(podeResolverPonto(p, eu.id, ehPmo), 'Só quem precisa decidir, o PMO ou quem abriu pode resolver este ponto.');
    exigir(resolucao.trim().length >= 3, 'Conte em poucas palavras o que foi decidido ou feito.');
    await db.update(t.pontosAtencao).set({ status: 'resolvido', resolucao: resolucao.trim(), resolvidoPor: eu.id, resolvidoEm: new Date() }).where(eq(t.pontosAtencao.id, id));
    const ini = dados.iniciativas.find((i) => i.id === p.iniciativaId);
    await notificar(dados.org.id, [p.abertoPor, ini?.gpId].filter((x) => x !== eu.id), `${eu.nome} resolveu o ponto de atenção "${p.titulo}": ${resolucao.trim()}`, ini ? `/projetos/${ini.id}#pontos` : '/pontos');
    return { ok: true, msg: 'Ponto de atenção resolvido.' };
  });
}
