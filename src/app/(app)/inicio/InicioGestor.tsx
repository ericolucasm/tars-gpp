import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { areasSobGestao, gestorDe, primeiroNome, timeDireto } from '@/lib/regras/pessoas';
import { alocacaoDe, cicloAtual, noRaia, pessoa } from '@/lib/visoes';
import { ItemAcao, PillFarol, Vazio } from '@/components/ui';
import { Saudacao } from './Saudacao';

export function InicioGestor({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const eu = sessao.pessoa;
  const aprovacoes = d.iniciativas.filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && (sessao.coringa || i.aprovadorId === eu.id))
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0));
  const urgentes = aprovacoes.filter((i) => i.tipo === 'obr' || i.urgencia === 'urg');
  const demais = aprovacoes.filter((i) => !urgentes.includes(i));
  const pedidos = d.pedidos.filter((p) => p.status === 'pendente' && (sessao.coringa || gestorDe(pessoa(d, p.pessoaId)!, d.areas) === eu.id));
  const time = sessao.coringa ? d.pessoas.filter((p) => !p.externo && p.id !== eu.id) : timeDireto(eu.id, d.pessoas, d.areas);
  const alocTime = time.map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje) }));
  const acima = alocTime.filter((x) => x.p.cedeAte != null && x.aloc > x.p.cedeAte);
  const espera = (iso: Date | null) => (iso ? Math.max(0, diffDias(hoje, iso.toISOString().slice(0, 10))) : 0);

  const pendentes = aprovacoes.length + pedidos.length;
  let texto = pendentes ? `Você tem ${pendentes} ${pendentes === 1 ? 'decisão pendente' : 'decisões pendentes'}.` : 'Nenhuma decisão pendente.';
  const obrig = urgentes.find((i) => i.tipo === 'obr');
  if (obrig) texto += ` Uma iniciativa obrigatória espera há ${espera(obrig.enviadaEm)} ${espera(obrig.enviadaEm) === 1 ? 'dia' : 'dias'}.`;

  const itens: React.ReactNode[] = [];
  for (const i of urgentes) {
    const sol = pessoa(d, i.solicitanteId);
    itens.push(<ItemAcao key={i.id} href="/area#aprovacoes" tom="ambar" titulo={`Aprovar: ${i.titulo}`} sub={`${sol?.nome ?? ''} · ${i.tipo === 'obr' ? 'obrigatória' : 'urgente'} · esperando há ${espera(i.enviadaEm)} ${espera(i.enviadaEm) === 1 ? 'dia' : 'dias'}`} acao="Decidir →" />);
  }
  if (demais.length === 1) {
    const i = demais[0];
    itens.push(<ItemAcao key="dem" href="/area#aprovacoes" titulo={`Aprovar: ${i.titulo}`} sub={`${pessoa(d, i.solicitanteId)?.nome ?? ''} · enviada há ${espera(i.enviadaEm)} dia(s)`} acao="Decidir →" />);
  } else if (demais.length > 1) {
    itens.push(<ItemAcao key="dem" href="/area#aprovacoes" titulo={`Aprovar ${urgentes.length ? 'mais ' : ''}${demais.length} iniciativas do time`}
      sub={demais.map((i) => `${i.titulo} (${primeiroNome(pessoa(d, i.solicitanteId)?.nome ?? '')})`).join(' · ')} acao="Decidir →" />);
  }
  for (const p of pedidos) {
    const proj = d.iniciativas.find((i) => i.id === p.iniciativaId);
    itens.push(<ItemAcao key={p.id} href="/area#capacidade" titulo="Pedido de alocação" sub={`${proj?.titulo ?? ''} pede +${p.deltaPct}% de ${pessoa(d, p.pessoaId)?.nome ?? ''}${p.aPartirDe ? ` a partir de ${p.aPartirDe}` : ''}`} acao="Responder →" />);
  }
  for (const x of acima) {
    itens.push(<ItemAcao key={x.p.id} href="/area#capacidade" titulo={`${x.p.nome} está acima do que você cedeu`} sub={`${x.aloc}% em projetos, limite de ${x.p.cedeAte}%`} acao="Ajustar →" />);
  }

  const minhas = new Set(sessao.coringa ? d.areas.map((a) => a.id) : areasSobGestao(eu.id, d.areas));
  const daArea = d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId));
  const projetos = daArea.filter((i) => noRaia(d, i, 'exe'));
  const nPre = daArea.filter((i) => noRaia(d, i, 'pre')).length;
  const nBkl = daArea.filter((i) => noRaia(d, i, 'bkl')).length;
  const ciclo = cicloAtual(d);
  const doCiclo = ciclo ? daArea.filter((i) => i.cicloId === ciclo.id && i.enviadaEm && i.solStatus !== 'rascunho') : [];
  const aprovadasPorMim = doCiclo.filter((i) => (sessao.coringa || i.aprovadorId === eu.id) && i.aprovadaGestorEm).length;
  const aguardando = doCiclo.filter((i) => i.solStatus === 'aguardando_gestor').length;
  const alocados = alocTime.filter((x) => x.aloc > 0).length;
  const media = alocTime.length ? Math.round(alocTime.reduce((sum, x) => sum + x.aloc, 0) / alocTime.length) : 0;
  const sCard = s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; color: #26213A');

  return (
    <>
      <Saudacao nome={eu.nome} hoje={hoje} texto={texto} />
      <section aria-label="Precisa de você" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Precisa de você</h2>
        {itens.length ? itens : <Vazio>Tudo em dia. Nenhuma decisão esperando você.</Vazio>}
      </section>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px')}>
        <Link href="/area" style={sCard}>
          <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Projetos da área</h2>
          {projetos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum projeto em execução.</span>}
          {projetos.map((p) => (
            <span key={p.id} style={s('font-size: 13px; display: flex; justify-content: space-between; align-items: center; gap: 8px')}><span>{p.titulo}</span><PillFarol farol={p.farol} ponto={false} /></span>
          ))}
          {(nPre > 0 || nBkl > 0) && <span style={s('font-size: 12px; color: #5E5770')}>+ {nPre} em pré-projeto e {nBkl} no backlog</span>}
        </Link>
        {ciclo && (
          <Link href="/area" style={{ ...sCard, gap: 10 }}>
            <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1; letter-spacing: 0.3px')}>CICLO {ciclo.nome.toUpperCase()}</span>
            <span style={s('font-size: 15px; font-weight: 700')}>Sua área enviou {doCiclo.length} {doCiclo.length === 1 ? 'iniciativa' : 'iniciativas'}</span>
            <span style={s('font-size: 13px; color: #4A4458')}>{aprovadasPorMim} já {aprovadasPorMim === 1 ? 'aprovada' : 'aprovadas'} por você · {aguardando} aguardando{ciclo.etapa === 'inscricoes' ? ` · inscrições até ${br(ciclo.fechamento).slice(0, 5)}` : ''}</span>
          </Link>
        )}
        <Link href="/area#capacidade" style={{ ...sCard, gap: 10 }}>
          <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Time em projetos</h2>
          <span style={s('font-size: 26px; font-weight: 700')}>{alocados} de {time.length}</span>
          <span style={s('font-size: 13px; color: #4A4458')}>pessoas alocadas · média de {media}% do tempo</span>
        </Link>
      </div>
    </>
  );
}
