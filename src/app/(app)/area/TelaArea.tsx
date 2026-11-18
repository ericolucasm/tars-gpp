import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO, haQuanto, mesCurto } from '@/lib/regras/datas';
import { NIVEIS_FEEDBACK } from '@/lib/regras/feedback';
import { areasSobGestao, gestorDe, iniciais, nomeCurto, timeDireto } from '@/lib/regras/pessoas';

const primeiroNome = (n: string) => n.split(' ')[0];
import { alocacaoDe, impactoDoPedido, prioridadesDoGestor, representados, chaveDaRaia, custoDe, infoProjeto, nomeCurtoProjeto, noRaia, pessoa, projetosDaPessoa, situacaoDoCard, TIPOS, URGENCIAS } from '@/lib/visoes';
import { detalheIniciativa } from '@/lib/detalhe';
import { Shell } from '@/components/Shell';
import { VisaoArea, type Aba } from './VisaoArea';

// Dados comuns às três telas do gestor: Iniciativas da área, Projetos da área e Gestão do time.
export async function TelaArea({ aba }: { aba: Aba }) {
  const sessao = await exigirPerfil('gestor');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const eu = sessao.pessoa;
  const minhas = areasSobGestao(eu.id, d.areas);
  const principal = d.areas.find((a) => a.responsavelId === eu.id && a.id === eu.areaId) ?? d.areas.find((a) => a.responsavelId === eu.id);
  const subareas = d.areas.filter((a) => a.parentId === principal?.id);
  let dir = principal;
  while (dir?.parentId) dir = d.areas.find((a) => a.id === dir!.parentId);

  const rep = representados(d, eu.id, hoje); // eu + gestores que me deixaram como substituto(a)
  const noLugar = (gestorId: string | null | undefined) => (gestorId && gestorId !== eu.id ? primeiroNome(pessoa(d, gestorId)?.nome ?? '') : null);
  const aprovacoes = d.iniciativas
    .filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && !!i.aprovadorId && rep.has(i.aprovadorId))
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0))
    .map((i) => ({
      id: i.id, titulo: i.titulo, noLugarDe: noLugar(i.aprovadorId), quem: pessoa(d, i.solicitanteId)?.nome ?? '', quando: haQuanto(i.enviadaEm?.toISOString(), hoje),
      problema: i.problema, tipo: TIPOS[i.tipo]?.rotulo ?? i.tipo, urg: URGENCIAS[i.urgencia] ?? '', urgente: i.urgencia === 'urg', custo: i.faixaCusto,
      det: detalheIniciativa(d, i, hoje),
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
    return { id: i.id, nome: i.titulo, tipo: projeto ? 'Projeto' : 'Iniciativa', chave: c ?? '', etapa: raia?.nome ?? '', info, farol: c === 'exe' || c === 'pau' ? i.farol : null, custo: custoDe(i), det: detalheIniciativa(d, i, hoje) };
  }).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'Projeto' ? -1 : 1));

  const daRep = [...rep].flatMap((g) => timeDireto(g, d.pessoas, d.areas).map((p) => ({ p, g })));
  const time = daRep.filter((x, k) => daRep.findIndex((y) => y.p.id === x.p.id) === k).map(({ p, g }) => {
    const projs = projetosDaPessoa(d, p.id, hoje);
    return {
      id: p.id, nome: p.nome, ini: iniciais(p.nome),
      papel: `${noLugar(g) ? `Time de ${noLugar(g)} · ` : ''}${p.cargo ?? ''} · ${projs.length ? projs.map((x) => `${nomeCurtoProjeto(x.projeto.titulo)} (${x.pct}%)`).join(', ') : 'sem projetos'}`,
      cap: p.cedeAte ?? 0, aloc: alocacaoDe(d, p.id, hoje),
      feedbacks: d.feedbacks.filter((f) => f.pessoaId === p.id).reverse().map((f) => ({
        id: f.id, nivel: f.nivel, rotulo: NIVEIS_FEEDBACK[f.nivel]?.rotulo ?? f.nivel, comentario: f.comentario,
        de: `${pessoa(d, f.autorId)?.nome ?? ''} · ${nomeCurtoProjeto(d.iniciativas.find((i) => i.id === f.iniciativaId)?.titulo ?? '')} · ${br(f.updatedAt.toISOString().slice(0, 10))}`,
      })),
      ausencias: d.ausencias.filter((a) => a.pessoaId === p.id && a.fim >= hoje).map((a) => ({ id: a.id, texto: `${a.motivo}: ${br(a.inicio)} a ${br(a.fim)}`, agora: a.inicio <= hoje })),
      alocado: p.tratamento === 'f' ? 'Alocada' : p.tratamento === 'm' ? 'Alocado' : 'Alocado(a)',
    };
  });

  const pedidos = d.pedidos.filter((x) => x.status === 'pendente').filter((x) => {
    const p = pessoa(d, x.pessoaId);
    return p && rep.has(gestorDe(p, d.areas) ?? '');
  }).map((x) => {
    const imp = impactoDoPedido(d, x, hoje);
    return {
    id: x.id, quem: primeiroNome(pessoa(d, x.pessoaId)?.nome ?? ''), noLugarDe: noLugar(gestorDe(pessoa(d, x.pessoaId)!, d.areas)),
    impacto: { ...imp, meses: imp.meses.map((m) => ({ ...m, mes: mesCurto(m.de) })) },
    texto: `${d.iniciativas.find((i) => i.id === x.iniciativaId)?.titulo ?? ''} pede +${x.deltaPct}% de ${pessoa(d, x.pessoaId)?.nome ?? ''}${x.aPartirDe ? ` a partir de ${x.aPartirDe}` : ''}.`, delta: x.deltaPct,
  };
  });

  return (
    <Shell sessao={sessao} dados={d} atual={`area-${aba}`}>
      <VisaoArea
        aba={aba}
        trilha={[dir && dir.id !== principal?.id ? dir.nome : null, principal?.nome].filter(Boolean).join(' / ')}
        nome={eu.nome}
        escopo={`${principal?.nome ?? 'Minha área'}${subareas.length ? ` + ${subareas.length} ${subareas.length === 1 ? 'subárea' : 'subáreas'} (${subareas.map((a) => a.nome).join(', ')})` : ''}`}
        aprovacoes={aprovacoes}
        linhas={linhas}
        time={time}
        pedidos={pedidos}
        motivos={d.org.config.motivos.recusa}
        substituicao={{
          minhas: d.delegacoes.filter((x) => x.gestorId === eu.id && x.fim >= hoje).map((x) => ({ id: x.id, texto: `${pessoa(d, x.substitutoId)?.nome ?? ''}: ${br(x.inicio)} a ${br(x.fim)}`, agora: x.inicio <= hoje })),
          substituindo: d.delegacoes.filter((x) => x.substitutoId === eu.id && x.inicio <= hoje && x.fim >= hoje).map((x) => `${pessoa(d, x.gestorId)?.nome ?? ''} até ${br(x.fim)}`),
          opcoes: d.pessoas.filter((p) => p.id !== eu.id && p.perfis.includes('gestor') && !p.externo && p.status !== 'inativo').map((p) => ({ id: p.id, nome: `${p.nome} · ${d.areas.find((a) => a.id === p.areaId)?.nome ?? ''}` })),
        }}
        prioridades={prioridadesDoGestor(d, eu.id).map((i) => ({ id: i.id, titulo: i.titulo, etapa: noRaia(d, i, 'bkl') ? 'Backlog' : 'Aguardando o PMO', quem: pessoa(d, i.solicitanteId)?.nome ?? '', ordenada: i.prioridadeArea != null }))}
        emExecucao={daArea.filter((i) => noRaia(d, i, 'exe')).length}
        rodando={daArea.filter((i) => noRaia(d, i, 'exe', 'pau')).length}
      />
    </Shell>
  );
}
