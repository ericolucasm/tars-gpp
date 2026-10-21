import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { addDias, br, hojeISO } from '@/lib/regras/datas';
import { cicloVM, indiceEtapa, numerosAoVivo, rotuloEtapa, type Snapshot } from '@/lib/ciclo-vm';
import { listaAvaliacao } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaCiclos, type CicloDet } from './TelaCiclos';

export const dynamic = 'force-dynamic';

export default async function Ciclos() {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const curta = (iso: string) => br(iso).slice(0, 5);

  const ciclos: CicloDet[] = d.ciclos.slice().sort((a, b) => b.ano - a.ano).map((c) => {
    const vm = cicloVM(d, c, hoje);
    const ativo = c.etapa !== 'encerrado';
    const n = ativo ? numerosAoVivo(d, c) : null;
    const f = (c.snapshot ?? {}) as Snapshot;
    const prontas = ativo ? listaAvaliacao(d).itens.filter((x) => !x.comunicado && x.ini.solStatus === 'aguardando_pmo').length : 0;
    const areasBloco = vm.blocos.find((b) => b.titulo === 'Áreas');
    return {
      id: c.id, nome: c.nome, descricao: c.descricao ?? '', etapa: c.etapa, etapaIdx: indiceEtapa(c), statusRotulo: rotuloEtapa(c),
      janela: `Inscrições ${curta(c.abertura)} a ${br(c.fechamento)}`,
      resumo: ativo ? `${n!.recebidas} ${n!.recebidas === 1 ? 'iniciativa recebida' : 'iniciativas recebidas'}` : `${f.recebidas ?? 0} recebidas · ${f.viraramProjeto ?? 0} viraram projeto`,
      etapas: [
        { nome: 'Inscrições', data: `${curta(c.abertura)} – ${curta(c.fechamento)}` },
        { nome: 'Aprovação dos gestores', data: `até ${curta(addDias(c.fechamento, 7))}` },
        { nome: 'Avaliação do PMO', data: `até ${curta(c.avaliacaoAte)}` },
        { nome: 'Comunicação', data: `até ${curta(c.comunicarAte)}` },
        { nome: 'Play dos projetos', data: c.playAPartir ?? '' },
      ],
      numeros: ativo
        ? [['Recebidas', n!.recebidas], ['Aguardando gestor', n!.aguardandoGestor], ['Prontas para avaliar', prontas], ['Áreas que enviaram', areasBloco?.linhas[0]?.v ?? '—']]
        : [['Recebidas', f.recebidas], ['Pré-aprovadas', f.preAprovadas], ['Viraram projeto', f.viraramProjeto], ['Backlog', f.backlog], ['Recusadas', f.recusadas]].filter((x) => x[1] !== undefined),
      semEnvio: areasBloco?.linhas.find((l) => l.k === 'Sem envio')?.v ?? '',
      motivos: (f.motivosRecusa ?? []).map(([m, q]) => `${m} (${q})`).join(' · '),
      comunicadoEm: c.comunicadoEm ? br(c.comunicadoEm) : '',
      campos: {
        abertura: c.abertura, fechamento: c.fechamento, avaliacaoAte: c.avaliacaoAte, comunicarAte: c.comunicarAte, orcamentoRef: c.orcamentoRef,
        publico: c.publico, areasPublico: c.areasPublico, avisoAbertura: c.avisoAbertura, avisoLembrete: c.avisoLembrete, avisoCobranca: c.avisoCobranca,
      },
    };
  });

  return (
    <Shell sessao={sessao} dados={d} atual="ciclos">
      <TelaCiclos
        ciclos={ciclos}
        empresa={d.org.nome}
        modo={d.org.modoCaptacao}
        areas={d.areas.filter((a) => a.tipo !== 'Coordenação').map((a) => ({ id: a.id, nome: a.nome }))}
      />
    </Shell>
  );
}
