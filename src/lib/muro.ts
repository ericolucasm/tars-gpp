import type { DadosOrg } from './dados';
import { br } from './regras/datas';
import { dataDaSemana } from './regras/projeto';
import { gestorDe } from './regras/pessoas';
import { diasDeAtraso, emNegociacao } from './regras/muro';
import { infoProjeto, noRaia, pessoa } from './visoes';

// Entregas com data de cada pessoa (tarefas, gates = fim de fase, status report) e quem está atrasado.

export type Entrega = {
  tipo: 'tarefa' | 'fase' | 'status'; id: string; iniciativaId: string; projeto: string; titulo: string;
  responsavelId: string; vencimento: string; diasAtraso: number; emNegociacao: boolean; gpId: string | null;
};

const curto = (t: string) => { const k = t.indexOf(' para '); return k > 0 ? t.slice(0, k) : t; };

/** Todas as entregas em aberto com data, nos projetos em execução (status) e em execução ou pausados (tarefas e gates). */
export function entregas(d: DadosOrg, hoje: string): Entrega[] {
  const res: Entrega[] = [];
  for (const i of d.iniciativas.filter((x) => noRaia(d, x, 'exe', 'pau') && x.inicioProjeto)) {
    const info = infoProjeto(d, i, hoje);
    const base = { iniciativaId: i.id, projeto: curto(i.titulo), gpId: i.gpId };
    for (const t of info.tarefas) {
      const resp = t.responsavelId ?? i.gpId;
      if (t.concluida || !t.prazo || !resp) continue;
      res.push({ ...base, tipo: 'tarefa', id: t.id, titulo: t.titulo, responsavelId: resp, vencimento: t.prazo, diasAtraso: diasDeAtraso(t.prazo, hoje), emNegociacao: emNegociacao(d.pedidosPrazo, 'tarefa', t.id) });
    }
    for (const f of info.fases) {
      const resp = f.responsavelId ?? i.gpId;
      if (f.confirmadaEm || !resp) continue;
      const fim = dataDaSemana(i.inicioProjeto!, f.inicioSemana + f.duracao);
      res.push({ ...base, tipo: 'fase', id: f.id, titulo: `Confirmar o fim da fase ${f.nome}`, responsavelId: resp, vencimento: fim, diasAtraso: diasDeAtraso(fim, hoje), emNegociacao: emNegociacao(d.pedidosPrazo, 'fase', f.id) });
    }
    if (noRaia(d, i, 'exe') && i.gpId) {
      res.push({ ...base, tipo: 'status', id: `status-${i.id}`, titulo: 'Publicar o status do projeto', responsavelId: i.gpId, vencimento: info.proximoStatus, diasAtraso: diasDeAtraso(info.proximoStatus, hoje), emNegociacao: false });
    }
  }
  return res.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/** Atrasos: venceu e ninguém registrou nada (nem pediu mais prazo). */
export function atrasos(d: DadosOrg, hoje: string) {
  return entregas(d, hoje).filter((e) => e.diasAtraso > 0 && !e.emNegociacao);
}

/** Ranking do muro: por pessoa, quantidade de atrasos e o maior atraso. */
export function muro(d: DadosOrg, hoje: string) {
  const porPessoa = new Map<string, Entrega[]>();
  for (const e of atrasos(d, hoje)) porPessoa.set(e.responsavelId, [...(porPessoa.get(e.responsavelId) ?? []), e]);
  return [...porPessoa.entries()].map(([id, itens]) => {
    const p = pessoa(d, id);
    return { pessoaId: id, nome: p?.nome ?? '—', areaId: p?.areaId ?? null, gestorId: p ? gestorDe(p, d.areas) : null, itens: itens.sort((a, b) => b.diasAtraso - a.diasAtraso), maior: Math.max(...itens.map((x) => x.diasAtraso)) };
  }).sort((a, b) => b.itens.length - a.itens.length || b.maior - a.maior);
}

export const TIPO_ENTREGA: Record<Entrega['tipo'], string> = { tarefa: 'Tarefa', fase: 'Gate (fim de fase)', status: 'Status report' };
export const venceTexto = (e: Entrega) => (e.diasAtraso > 0 ? `venceu em ${br(e.vencimento)} · ${e.diasAtraso} ${e.diasAtraso === 1 ? 'dia' : 'dias'} de atraso` : `vence em ${br(e.vencimento)}`);
