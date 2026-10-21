import type { Criterio } from '@/db/schema';

// Motor da esteira do portfólio: dado onde o card está e a configuração das raias,
// diz quais ações existem e qual gate (critérios) cada uma exige.

export type Raia = {
  id: string;
  chave: string | null;
  nome: string;
  descricao: string;
  aprovador: string;
  tipoCard: string;
  ordem: number;
  saida: boolean;
  criterios: Criterio[];
  gateTitulo: string | null;
  gateDica: string | null;
  gateConfirmar: string | null;
  acaoRotulo: string | null;
  criteriosRetomada: Criterio[] | null;
};

export type TipoAcao = 'aprovar_gestor' | 'avancar' | 'pausar' | 'retomar' | 'cancelar';

export type Acao = {
  tipo: TipoAcao;
  rotulo: string; // texto do botão no card
  gateKey: string; // chave para guardar o progresso do checklist
  paraRaiaId: string;
  titulo: string;
  dica: string;
  confirmar: string;
  criterios: Criterio[];
  aprovador: string;
};

export type AcoesCard = { primaria?: Acao; secundaria?: Acao; cancelar?: Acao };

export function ordenar(raias: Raia[]) {
  return raias.slice().sort((a, b) => a.ordem - b.ordem);
}

/** Raias por onde o card avança com a ação principal: sem a saída e sem "Pausado" (que é lateral). */
export function fluxoPrincipal(raias: Raia[]) {
  return ordenar(raias).filter((r) => !r.saida && r.chave !== 'pau');
}

function gateDe(r: Raia, tipo: TipoAcao): Acao {
  return {
    tipo,
    rotulo: r.acaoRotulo || `Mover para ${r.nome}`,
    gateKey: r.id,
    paraRaiaId: r.id,
    titulo: r.gateTitulo || `Mover para ${r.nome}`,
    dica: r.gateDica || r.descricao,
    confirmar: r.gateConfirmar || 'Mover',
    criterios: r.criterios,
    aprovador: r.aprovador,
  };
}

export function acoesDoCard(card: { raiaId: string; solStatus: string | null }, raias: Raia[]): AcoesCard {
  const atual = raias.find((r) => r.id === card.raiaId);
  if (!atual || atual.saida) return {};
  const res: AcoesCard = {};
  const porChave = (k: string) => raias.find((r) => r.chave === k);

  if (atual.chave === 'sol' && card.solStatus !== 'aguardando_pmo') {
    // Rascunho e devolvida dependem do solicitante; aguardando gestor tem o gate do gestor.
    if (card.solStatus === 'aguardando_gestor') {
      res.primaria = { ...gateDe(atual, 'aprovar_gestor'), gateKey: 'gestor', paraRaiaId: atual.id };
    }
  } else if (atual.chave === 'pau') {
    const exe = porChave('exe');
    if (exe) {
      res.primaria = {
        tipo: 'retomar',
        rotulo: 'Retomar',
        gateKey: 'retomar',
        paraRaiaId: exe.id,
        titulo: 'Retomar projeto',
        dica: 'Antes de voltar a rodar, confirme que o motivo da pausa foi resolvido.',
        confirmar: 'Retomar',
        criterios: atual.criteriosRetomada ?? [],
        aprovador: atual.aprovador,
      };
    }
  } else {
    const fluxo = fluxoPrincipal(raias);
    const i = fluxo.findIndex((r) => r.id === atual.id);
    const prox = i >= 0 ? fluxo[i + 1] : undefined;
    if (prox) res.primaria = gateDe(prox, 'avancar');
  }

  if (atual.chave === 'exe') {
    const pau = porChave('pau');
    if (pau) res.secundaria = { ...gateDe(pau, 'pausar'), rotulo: 'Pausar' };
  }

  if (atual.chave !== 'exe' && atual.chave !== 'con') {
    const saida = raias.find((r) => r.saida);
    if (saida) res.cancelar = { ...gateDe(saida, 'cancelar'), rotulo: 'Cancelar' };
  }
  return res;
}

/** Todos os critérios obrigatórios precisam estar marcados. */
export function validarGate(criterios: Criterio[], marcados: boolean[]) {
  const faltam = criterios.filter((c, i) => c.obrigatorio && !marcados[i]).length;
  return {
    ok: faltam === 0,
    faltam,
    mensagem: faltam === 0 ? '' : faltam === 1 ? 'Falta 1 critério para avançar.' : `Faltam ${faltam} critérios para avançar.`,
  };
}

export type PapelNoCard = {
  ehPmo: boolean;
  ehSolicitante: boolean;
  ehAprovador: boolean; // gestor que aprova esta iniciativa
  ehGp: boolean;
  ehPatrocinador: boolean;
};

/** Quem pode confirmar a entrada numa raia. O PMO sempre pode. */
export function podeConfirmar(aprovador: string, p: PapelNoCard): boolean {
  if (p.ehPmo) return true;
  switch (aprovador) {
    case 'Solicitante': return p.ehSolicitante;
    case 'Gestor da área solicitante': return p.ehAprovador;
    case 'Gerente de projeto': return p.ehGp;
    case 'Patrocinador': return p.ehPatrocinador;
    default: return false;
  }
}

/** Card é "projeto" nas raias marcadas como Projeto (execução, pausado, concluído por padrão). */
export function ehProjeto(raia: Raia | undefined) {
  return raia?.tipoCard === 'Projeto';
}
