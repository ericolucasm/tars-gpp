import type { DadosOrg, Pessoa } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { rotuloGestorCurto } from '@/lib/regras/pessoas';
import { aprovadorDe, cicloAberto, pessoa } from '@/lib/visoes';

// Tudo que o formulário de iniciativa precisa saber sobre quem está enviando.
export function contextoForm(d: DadosOrg, sessao: Sessao, hoje: string) {
  const eu = sessao.pessoa;
  const area = d.areas.find((a) => a.id === eu.areaId);
  let dir = area;
  while (dir?.parentId) dir = d.areas.find((a) => a.id === dir!.parentId);
  const aprov = pessoa(d, aprovadorDe(d, eu));
  const ciclo = cicloAberto(d);
  return {
    area: area?.nome ?? 'Sem área',
    dir: dir && dir.id !== area?.id ? dir.nome : '',
    aprovador: aprov?.nome ?? 'PMO',
    aprovadorCargo: aprov ? cargoDoAprovador(d, aprov) : 'Sem gestor acima: vai direto ao PMO',
    home: '/inicio',
    ciclo: ciclo ? { nome: ciclo.nome, ate: br(ciclo.fechamento), faltam: Math.max(0, diffDias(ciclo.fechamento, hoje)) } : null,
    areas: d.areas.filter((a) => a.tipo === 'Gerência' && a.id !== eu.areaId && a.nome !== 'PMO').map((a) => ({ id: a.id, nome: a.nome })),
  };
}

function cargoDoAprovador(d: DadosOrg, p: Pessoa) {
  const area = d.areas.find((a) => a.responsavelId === p.id && a.id === p.areaId) ?? d.areas.find((a) => a.responsavelId === p.id);
  if (area && area.tipo !== 'Diretoria') return `${rotuloGestorCurto(p.tratamento as 'f' | 'm' | 'n')} da ${area.nome}`;
  return p.cargo ? p.cargo.charAt(0).toUpperCase() + p.cargo.slice(1) : 'Gestor';
}

export type ContextoForm = ReturnType<typeof contextoForm>;
