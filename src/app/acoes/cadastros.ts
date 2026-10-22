'use server';

import { and, eq } from 'drizzle-orm';
import { db, schema as t } from '@/db';
import type { Criterio } from '@/db/schema';
import { somaPesos } from '@/lib/regras/avaliacao';
import { subarvore } from '@/lib/regras/pessoas';
import { urlDoApp } from '@/lib/auth';
import { contexto, executar, exigir, exigirAdminCtx } from './_ctx';

async function ctxAdmin() {
  const ctx = await contexto();
  exigirAdminCtx(ctx.sessao);
  return ctx;
}

const PERFIS_VALIDOS = ['colaborador', 'gestor', 'gp', 'pmo', 'patrocinador'];

export type PessoaForm = { id?: string; nome: string; email: string; areaId: string; cargo: string; perfis: string[]; admin: boolean; cedeAte: number | null; tratamento: string; externo: boolean };

export async function salvarPessoa(f: PessoaForm) {
  return executar(async () => {
    const { dados, sessao } = await ctxAdmin();
    const email = f.email.trim().toLowerCase();
    exigir(f.nome.trim(), 'Informe o nome.');
    exigir(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'Informe um e-mail válido.');
    exigir(f.perfis.every((p) => PERFIS_VALIDOS.includes(p)), 'Perfil inválido.');
    exigir(dados.pessoas.every((p) => p.id === f.id || p.email !== email), 'Já existe uma pessoa com este e-mail.');
    if (f.id === sessao.real.id) exigir(f.admin, 'Você não pode tirar o seu próprio acesso de admin.');
    const campos = {
      nome: f.nome.trim(), email, areaId: f.areaId || null, cargo: f.cargo.trim() || null, perfis: f.perfis, admin: f.admin,
      cedeAte: f.externo ? null : f.cedeAte, tratamento: ['f', 'm', 'n'].includes(f.tratamento) ? f.tratamento : 'n', externo: f.externo,
    };
    if (f.id) {
      await db.update(t.pessoas).set(campos).where(and(eq(t.pessoas.id, f.id), eq(t.pessoas.orgId, dados.org.id)));
      return { ok: true, msg: 'Pessoa atualizada.' };
    }
    await db.insert(t.pessoas).values({ orgId: dados.org.id, ...campos, status: f.externo ? 'ativo' : 'convite' });
    if (f.externo) return { ok: true, msg: 'Fornecedor cadastrado.' };
    // Acesso liberado: a pessoa entra com a conta Google deste e-mail
    return { ok: true, msg: `Pessoa cadastrada. Avise ${f.nome.trim().split(' ')[0]} para entrar em ${urlDoApp()} com a conta Google ${email}.` };
  });
}

export type AreaForm = { id?: string; nome: string; tipo: string; parentId: string; responsavelId: string; headcount: number | null };

export async function salvarArea(f: AreaForm) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    exigir(f.nome.trim(), 'Informe o nome da área.');
    exigir(['Diretoria', 'Gerência', 'Coordenação'].includes(f.tipo), 'Tipo inválido.');
    if (f.id && f.parentId) exigir(!subarvore(f.id, dados.areas).includes(f.parentId), 'Uma área não pode ficar abaixo dela mesma.');
    const campos = { nome: f.nome.trim(), tipo: f.tipo, parentId: f.parentId || null, responsavelId: f.responsavelId || null, headcount: f.headcount };
    if (f.id) await db.update(t.areas).set(campos).where(and(eq(t.areas.id, f.id), eq(t.areas.orgId, dados.org.id)));
    else await db.insert(t.areas).values({ orgId: dados.org.id, ...campos, ordem: dados.areas.length });
    return { ok: true, msg: f.id ? 'Área atualizada.' : 'Área criada.' };
  });
}

export async function salvarFaseBiblioteca(f: { id?: string; nome: string; duracaoSemanas: number; criterioConclusao: string }) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    exigir(f.nome.trim(), 'Informe o nome da fase.');
    exigir(f.duracaoSemanas >= 1 && f.duracaoSemanas <= 104, 'Duração entre 1 e 104 semanas.');
    const campos = { nome: f.nome.trim(), duracaoSemanas: Math.round(f.duracaoSemanas), criterioConclusao: f.criterioConclusao.trim() };
    if (f.id) await db.update(t.fasesBiblioteca).set(campos).where(and(eq(t.fasesBiblioteca.id, f.id), eq(t.fasesBiblioteca.orgId, dados.org.id)));
    else await db.insert(t.fasesBiblioteca).values({ orgId: dados.org.id, ...campos, ordem: dados.fasesBiblioteca.length });
    return { ok: true, msg: f.id ? 'Fase atualizada.' : 'Fase criada.' };
  });
}

export async function salvarModelo(f: { id?: string; nome: string; descricao: string; fases: string[] }) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    exigir(f.nome.trim(), 'Informe o nome do modelo.');
    exigir(f.fases.length > 0, 'Escolha ao menos uma fase.');
    exigir(f.fases.every((id) => dados.fasesBiblioteca.some((b) => b.id === id)), 'Fase inválida.');
    const campos = { nome: f.nome.trim(), descricao: f.descricao.trim(), fases: f.fases };
    if (f.id) await db.update(t.modelos).set(campos).where(and(eq(t.modelos.id, f.id), eq(t.modelos.orgId, dados.org.id)));
    else await db.insert(t.modelos).values({ orgId: dados.org.id, ...campos });
    return { ok: true, msg: f.id ? 'Modelo atualizado.' : 'Modelo criado.' };
  });
}

export async function salvarPesos(pesos: [number, number, number, number]) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    exigir(pesos.length === 4 && pesos.every((p) => p >= 0 && p <= 100), 'Pesos inválidos.');
    exigir(somaPesos(pesos) === 100, 'Os pesos precisam somar 100%.');
    await db.update(t.orgs).set({ config: { ...dados.org.config, pesos } }).where(eq(t.orgs.id, dados.org.id));
    return { ok: true, msg: 'Pesos salvos. A avaliação já usa os novos pesos.' };
  });
}

type Grupo = 'recusa' | 'pausa' | 'cancelamento';

export async function adicionarMotivo(grupo: Grupo, texto: string) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    const v = texto.trim();
    exigir(v, 'Escreva o motivo.');
    const lista = dados.org.config.motivos[grupo];
    exigir(lista && !lista.includes(v), 'Este motivo já existe.');
    await db.update(t.orgs).set({ config: { ...dados.org.config, motivos: { ...dados.org.config.motivos, [grupo]: [...lista, v] } } }).where(eq(t.orgs.id, dados.org.id));
  });
}

export async function removerMotivo(grupo: Grupo, texto: string) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    const lista = dados.org.config.motivos[grupo].filter((m) => m !== texto);
    exigir(lista.length > 0, 'Mantenha ao menos um motivo em cada grupo.');
    await db.update(t.orgs).set({ config: { ...dados.org.config, motivos: { ...dados.org.config.motivos, [grupo]: lista } } }).where(eq(t.orgs.id, dados.org.id));
  });
}

// ---------- Raias (Configurações) ----------

export type RaiaForm = { id: string; novo?: boolean; nome: string; descricao: string; aprovador: string; tipoCard: string; criterios: Criterio[] };

const APROVADORES = ['Solicitante', 'Gestor da área solicitante', 'PMO', 'Gerente de projeto', 'Patrocinador'];

/** Salva o fluxo inteiro: ordem, textos, critérios, raias novas e excluídas. */
export async function salvarRaias(fluxo: RaiaForm[], saida: RaiaForm) {
  return executar(async () => {
    const { dados } = await ctxAdmin();
    const todas = [...fluxo, saida];
    for (const r of todas) {
      exigir(r.nome.trim(), 'Toda raia precisa de um nome.');
      exigir(APROVADORES.includes(r.aprovador), 'Aprovador inválido.');
      exigir(['Iniciativa', 'Projeto'].includes(r.tipoCard), 'Tipo de card inválido.');
      exigir(r.criterios.every((c) => c.texto.trim()), 'Critérios não podem ficar em branco.');
    }
    const atuais = dados.raias;
    const saidaAtual = atuais.find((r) => r.saida);
    exigir(saidaAtual && saidaAtual.id === saida.id, 'A raia de saída não pode ser trocada.');
    const removidas = atuais.filter((r) => !r.saida && !fluxo.some((f) => f.id === r.id));
    for (const r of removidas) {
      exigir(!r.chave, `A raia "${r.nome}" é padrão e não pode ser excluída.`);
      exigir(!dados.iniciativas.some((i) => i.raiaId === r.id), `A raia "${r.nome}" tem cards e não pode ser excluída.`);
    }
    await db.transaction(async (tx) => {
      for (const r of removidas) await tx.delete(t.raias).where(eq(t.raias.id, r.id));
      for (const [i, r] of fluxo.entries()) {
        const campos = { nome: r.nome.trim(), descricao: r.descricao.trim(), aprovador: r.aprovador, tipoCard: r.tipoCard, criterios: r.criterios.map((c) => ({ texto: c.texto.trim(), obrigatorio: c.obrigatorio })), ordem: (i + 1) * 10 };
        if (r.novo) await tx.insert(t.raias).values({ orgId: dados.org.id, ...campos });
        else await tx.update(t.raias).set(campos).where(and(eq(t.raias.id, r.id), eq(t.raias.orgId, dados.org.id)));
      }
      await tx.update(t.raias).set({ nome: saida.nome.trim(), descricao: saida.descricao.trim(), aprovador: saida.aprovador, criterios: saida.criterios, ordem: (fluxo.length + 1) * 10 }).where(eq(t.raias.id, saida.id));
    });
    return { ok: true, msg: 'Raias salvas. O portfólio já segue o novo fluxo nos próximos movimentos.' };
  });
}
