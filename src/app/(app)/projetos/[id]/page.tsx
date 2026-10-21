import { notFound, redirect } from 'next/navigation';
import { exigirSessao, temPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO } from '@/lib/regras/datas';
import { iniciais } from '@/lib/regras/pessoas';
import { semanaHoje } from '@/lib/regras/projeto';
import { fasesDo, linhaBaseDo, nomeArea, pessoa } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { TelaProjeto } from './TelaProjeto';

export const dynamic = 'force-dynamic';

export default async function Projeto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fase?: string }> }) {
  const { id } = await params;
  const { fase } = await searchParams;
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const ini = d.iniciativas.find((i) => i.id === id);
  if (!ini || !ini.inicioProjeto) notFound();
  const ehPmo = temPerfil(sessao, 'pmo');
  const ehGp = ini.gpId === sessao.pessoa.id;
  if (!ehPmo && !ehGp) redirect('/inicio');
  const hoje = hojeISO();

  const fases = fasesDo(d, ini.id);
  const faseIds = new Set(fases.map((f) => f.id));
  const ciclo = d.ciclos.find((c) => c.id === ini.cicloId);
  const patro = pessoa(d, ini.patrocinadorId);
  const modelo = d.modelos.find((m) => m.id === ini.modeloId);
  const raia = d.raias.find((r) => r.id === ini.raiaId);
  const mud = d.mudancas.find((m) => m.iniciativaId === ini.id && m.status === 'pendente');
  const alocIds = new Set(d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => a.pessoaId));

  const cab = ['PROJETO', nomeArea(d, ini.areaId).toUpperCase(), ciclo ? `CICLO ${ciclo.ano}` : 'FORA DO CICLO'].join(' · ');
  const patroTxt = [
    patro ? `Patrocinador: ${patro.nome}${patro.cargo ? ` (${patro.cargo})` : ''}` : ini.patrocinadorTexto ? `Patrocinador: ${ini.patrocinadorTexto}` : null,
    modelo ? `Modelo: ${modelo.nome}` : null,
    raia && raia.chave !== 'exe' ? `Etapa: ${raia.nome}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Shell sessao={sessao} dados={d} atual={`projeto:${ini.id}`}>
      <TelaProjeto
        p={{
          id: ini.id, titulo: ini.titulo, cabecalho: cab, patrocinio: patroTxt, farol: (ini.farol ?? 'ok') as 'ok' | 'aten' | 'crit',
          inicio: ini.inicioProjeto, inicioLabel: br(ini.inicioProjeto), hoje, semanaHoje: semanaHoje(ini.inicioProjeto, hoje),
          fases: fases.map((f) => ({ id: f.id, nome: f.nome, inicioSemana: f.inicioSemana, duracao: f.duracao, criterio: f.criterioConclusao, confirmada: f.confirmadaEm ? br(f.confirmadaEm.toISOString().slice(0, 10)) : null })),
          base: linhaBaseDo(d, ini.id),
          biblioteca: d.fasesBiblioteca.map((b) => ({ id: b.id, nome: b.nome, dur: b.duracaoSemanas })),
          tarefas: d.tarefas.filter((t) => t.iniciativaId === ini.id).map((t) => ({ id: t.id, faseId: t.faseId, titulo: t.titulo, responsavelId: t.responsavelId, prazo: t.prazo, concluida: t.concluida })),
          alocs: d.alocacoes.filter((a) => faseIds.has(a.faseId)).map((a) => ({ faseId: a.faseId, pessoaId: a.pessoaId, pct: a.pct })),
          pessoas: d.pessoas.filter((p) => p.status === 'ativo' || alocIds.has(p.id)).map((p) => ({
            id: p.id, nome: p.nome, ini: iniciais(p.nome), papel: [p.cargo, p.externo ? null : nomeArea(d, p.areaId)].filter(Boolean).join(' · '), cap: p.externo ? null : p.cedeAte, noProjeto: alocIds.has(p.id) || p.id === ini.gpId,
          })),
          marcos: d.marcos.filter((m) => faseIds.has(m.faseId)).map((m) => ({ id: m.id, faseId: m.faseId, nome: m.nome, data: m.data, status: m.status })),
          riscos: d.riscos.filter((r) => faseIds.has(r.faseId)).map((r) => ({ id: r.id, faseId: r.faseId, nome: r.nome, nivel: r.nivel })),
          reports: d.reports.filter((r) => r.iniciativaId === ini.id).sort((a, b) => b.data.localeCompare(a.data)).map((r) => ({ id: r.id, data: r.data, farol: r.farol, desvio: r.desvio, a: r.avancou, b: r.aSeguir, c: r.atencao })),
          mudanca: mud ? { id: mud.id, descricao: mud.descricao, solicitante: pessoa(d, mud.solicitanteId)?.nome ?? '' } : null,
          ehPmo, gpId: ini.gpId ?? '',
          faseInicial: fase && faseIds.has(fase) ? fase : '',
        }}
      />
    </Shell>
  );
}
