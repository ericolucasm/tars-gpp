import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO, haQuanto } from '@/lib/regras/datas';
import { areasSobGestao, gestorDe, iniciais, nomeCurto, timeDireto } from '@/lib/regras/pessoas';
import { alocacaoDe, chaveDaRaia, custoDe, infoProjeto, nomeCurtoProjeto, noRaia, pessoa, projetosDaPessoa, situacaoDoCard, TIPOS, URGENCIAS } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { VisaoArea } from './VisaoArea';

export const dynamic = 'force-dynamic';

export default async function Area() {
  const sessao = await exigirPerfil('gestor');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const eu = sessao.pessoa;
  const minhas = areasSobGestao(eu.id, d.areas);
  const principal = d.areas.find((a) => a.responsavelId === eu.id && a.id === eu.areaId) ?? d.areas.find((a) => a.responsavelId === eu.id);
  const subareas = d.areas.filter((a) => a.parentId === principal?.id);
  let dir = principal;
  while (dir?.parentId) dir = d.areas.find((a) => a.id === dir!.parentId);

  const aprovacoes = d.iniciativas
    .filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && i.aprovadorId === eu.id)
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0))
    .map((i) => ({
      id: i.id, titulo: i.titulo, quem: pessoa(d, i.solicitanteId)?.nome ?? '', quando: haQuanto(i.enviadaEm?.toISOString(), hoje),
      problema: i.problema, tipo: TIPOS[i.tipo]?.rotulo ?? i.tipo, urg: URGENCIAS[i.urgencia] ?? '', urgente: i.urgencia === 'urg', custo: i.faixaCusto,
    }));

  const daArea = d.iniciativas.filter((i) => i.areaId && minhas.includes(i.areaId) && !noRaia(d, i, 'sol', 'can'));
  const linhas = daArea.map((i) => {
    const c = chaveDaRaia(d, i.raiaId);
    const raia = d.raias.find((r) => r.id === i.raiaId);
    const projeto = raia?.tipoCard === 'Projeto';
    let info = situacaoDoCard(d, i);
    if (c === 'exe' || c === 'pau') {
      const ip = infoProjeto(d, i, hoje);
      const gp = pessoa(d, i.gpId);
      info = `GP: ${gp ? nomeCurto(gp.nome) : '—'} · ${ip.riscos.length ? `${ip.riscos.length} ${ip.riscos.length === 1 ? 'risco aberto' : 'riscos abertos'}` : `fim ${br(ip.fimPrevisto).slice(0, 5)}`}`;
    } else if (c === 'con') info = `Entregue em ${br(i.concluidaEm?.toISOString().slice(0, 10)).slice(0, 5)}`;
    return { id: i.id, nome: i.titulo, tipo: projeto ? 'Projeto' : 'Iniciativa', etapa: raia?.nome ?? '', info, farol: c === 'exe' || c === 'pau' ? i.farol : null, custo: custoDe(i) };
  }).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'Projeto' ? -1 : 1));

  const time = timeDireto(eu.id, d.pessoas, d.areas).map((p) => {
    const projs = projetosDaPessoa(d, p.id, hoje);
    return {
      id: p.id, nome: p.nome, ini: iniciais(p.nome),
      papel: `${p.cargo ?? ''} · ${projs.length ? projs.map((x) => `${nomeCurtoProjeto(x.projeto.titulo)} (${x.pct}%)`).join(', ') : 'sem projetos'}`,
      cap: p.cedeAte ?? 0, aloc: alocacaoDe(d, p.id, hoje),
      alocado: p.tratamento === 'f' ? 'Alocada' : p.tratamento === 'm' ? 'Alocado' : 'Alocado(a)',
    };
  });

  const pedidos = d.pedidos.filter((x) => x.status === 'pendente').filter((x) => {
    const p = pessoa(d, x.pessoaId);
    return p && gestorDe(p, d.areas) === eu.id;
  }).map((x) => ({
    id: x.id, texto: `${d.iniciativas.find((i) => i.id === x.iniciativaId)?.titulo ?? ''} pede +${x.deltaPct}% de ${pessoa(d, x.pessoaId)?.nome ?? ''}${x.aPartirDe ? ` a partir de ${x.aPartirDe}` : ''}.`, delta: x.deltaPct,
  }));

  return (
    <Shell sessao={sessao} dados={d} atual="area">
      <VisaoArea
        trilha={[dir && dir.id !== principal?.id ? dir.nome : null, principal?.nome].filter(Boolean).join(' / ')}
        nome={eu.nome}
        escopo={`${principal?.nome ?? 'Minha área'}${subareas.length ? ` + ${subareas.length} ${subareas.length === 1 ? 'subárea' : 'subáreas'} (${subareas.map((a) => a.nome).join(', ')})` : ''}`}
        aprovacoes={aprovacoes}
        linhas={linhas}
        time={time}
        pedidos={pedidos}
        emExecucao={daArea.filter((i) => noRaia(d, i, 'exe')).length}
      />
    </Shell>
  );
}
