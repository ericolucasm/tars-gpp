import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { areasSobGestao, gestorDe, primeiroNome, timeDireto } from '@/lib/regras/pessoas';
import { alocacaoDe, cicloAtual, financeiroDo, noRaia, pessoa, representados } from '@/lib/visoes';
import { ItemAcao, PillFarol, Vazio } from '@/components/ui';
import { pontoAtrasado, pontoEsperaPor } from '@/lib/regras/pontos';
import { beneficiosParaMedir } from '@/lib/beneficios-vm';
import { atrasos } from '@/lib/muro';
import { Saudacao } from './Saudacao';

export function InicioGestor({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const eu = sessao.pessoa;
  const rep = representados(d, eu.id, hoje); // eu + gestores que me deixaram como substituto(a)
  const aprovacoes = d.iniciativas.filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && !!i.aprovadorId && rep.has(i.aprovadorId))
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0));
  const urgentes = aprovacoes.filter((i) => i.tipo === 'obr' || i.urgencia === 'urg');
  const demais = aprovacoes.filter((i) => !urgentes.includes(i));
  const pedidos = d.pedidos.filter((p) => p.status === 'pendente' && rep.has(gestorDe(pessoa(d, p.pessoaId)!, d.areas) ?? ''));
  const time = timeDireto(eu.id, d.pessoas, d.areas);
  const alocTime = time.map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje) }));
  const acima = alocTime.filter((x) => x.p.cedeAte != null && x.aloc > x.p.cedeAte);
  const espera = (iso: Date | null) => (iso ? Math.max(0, diffDias(hoje, iso.toISOString().slice(0, 10))) : 0);

  const pendentes = aprovacoes.length + pedidos.length;
  let texto = pendentes ? `Você tem ${pendentes} ${pendentes === 1 ? 'decisão pendente' : 'decisões pendentes'}.` : 'Nenhuma decisão pendente.';
  const obrig = urgentes.find((i) => i.tipo === 'obr');
  if (obrig) texto += ` Uma iniciativa obrigatória espera há ${espera(obrig.enviadaEm)} ${espera(obrig.enviadaEm) === 1 ? 'dia' : 'dias'}.`;

  const itens: React.ReactNode[] = [];
  for (const x of d.delegacoes.filter((y) => y.substitutoId === eu.id && y.inicio <= hoje && y.fim >= hoje)) {
    itens.push(<ItemAcao key={`sub${x.id}`} href="/area/iniciativas" tom="roxo" titulo={`Você está substituindo ${pessoa(d, x.gestorId)?.nome ?? ''} até ${br(x.fim).slice(0, 5)}`}
      sub="As aprovações, os pedidos de alocação e o time dele(a) aparecem junto com os seus." acao="Ver →" />);
  }
  const minhasAreas = new Set(areasSobGestao(eu.id, d.areas));
  const estourando = d.iniciativas.filter((i) => i.areaId && minhasAreas.has(i.areaId) && noRaia(d, i, 'exe', 'pau'))
    .map((i) => ({ i, f: financeiroDo(d, i) })).filter((x) => x.f.situacao === 'crit');
  if (estourando.length) {
    itens.push(<ItemAcao key="custo-area" href="/relatorios?r.financeiro.situacao=crit#financeiro" numero={estourando.length} tom="vermelho"
      titulo={estourando.length === 1 ? 'Projeto da área estourando o orçamento' : 'Projetos da área estourando o orçamento'}
      sub={estourando.map((x) => `${x.i.titulo.split(' para ')[0]} (+${x.f.desvioPct}%)`).join(' · ')} acao="Ver custos →" />);
  }
  const meusAtrasos = atrasos(d, hoje).filter((x) => x.responsavelId === eu.id);
  if (meusAtrasos.length) {
    itens.push(<ItemAcao key="meus-atrasos" href="/minhas-entregas" numero={meusAtrasos.length} tom="vermelho"
      titulo={meusAtrasos.length === 1 ? 'Você tem uma entrega atrasada' : `Você tem ${meusAtrasos.length} entregas atrasadas`}
      sub={meusAtrasos.slice(0, 3).map((x) => `${x.titulo} (${x.diasAtraso}d)`).join(' · ')} acao="Resolver →" />);
  }
  const doTime = atrasos(d, hoje).filter((x) => time.some((p) => p.id === x.responsavelId));
  if (doTime.length) {
    const nomes = [...new Set(doTime.map((x) => pessoa(d, x.responsavelId)?.nome ?? ''))];
    itens.push(<ItemAcao key="muro-time" href="/muro" numero={nomes.length} tom="vermelho" titulo={nomes.length === 1 ? 'Pessoa do seu time com entregas atrasadas' : 'Pessoas do seu time com entregas atrasadas'}
      sub={`${nomes.join(', ')} · ${doTime.length} ${doTime.length === 1 ? 'entrega' : 'entregas'} vencida(s) sem registro`} acao="Ver →" />);
  }
  for (const i of urgentes) {
    const sol = pessoa(d, i.solicitanteId);
    itens.push(<ItemAcao key={i.id} href="/area/iniciativas" tom="ambar" titulo={`Aprovar: ${i.titulo}`} sub={`${sol?.nome ?? ''} · ${i.tipo === 'obr' ? 'obrigatória' : 'urgente'} · esperando há ${espera(i.enviadaEm)} ${espera(i.enviadaEm) === 1 ? 'dia' : 'dias'}`} acao="Decidir →" />);
  }
  if (demais.length === 1) {
    const i = demais[0];
    itens.push(<ItemAcao key="dem" href="/area/iniciativas" titulo={`Aprovar: ${i.titulo}`} sub={`${pessoa(d, i.solicitanteId)?.nome ?? ''} · enviada há ${espera(i.enviadaEm)} dia(s)`} acao="Decidir →" />);
  } else if (demais.length > 1) {
    itens.push(<ItemAcao key="dem" href="/area/iniciativas" titulo={`Aprovar ${urgentes.length ? 'mais ' : ''}${demais.length} iniciativas do time`}
      sub={demais.map((i) => `${i.titulo} (${primeiroNome(pessoa(d, i.solicitanteId)?.nome ?? '')})`).join(' · ')} acao="Decidir →" />);
  }
  const aMedir = beneficiosParaMedir(d, eu.id, false, hoje);
  if (aMedir.length) {
    itens.push(<ItemAcao key="beneficios" href="/beneficios" numero={aMedir.length} titulo={aMedir.length === 1 ? 'Benefício para medir' : 'Benefícios para medir'}
      sub={aMedir.slice(0, 3).map((i) => `${i.titulo.split(' para ')[0]}: ${i.beneficioIndicador}`).join(' · ')} acao="Registrar →" />);
  }
  const pontos = d.pontos.filter((x) => pontoEsperaPor(x, eu.id, false));
  if (pontos.length) {
    const atrasados = pontos.filter((x) => pontoAtrasado(x, hoje)).length;
    itens.push(<ItemAcao key="pontos" href="/pontos" numero={pontos.length} tom={atrasados ? 'vermelho' : 'roxo'}
      titulo={pontos.length === 1 ? 'Ponto de atenção esperando por você' : 'Pontos de atenção esperando por você'}
      sub={pontos.map((x) => `${x.titulo} (${d.iniciativas.find((i) => i.id === x.iniciativaId)?.titulo.split(' para ')[0] ?? ''})`).join(' · ') + (atrasados ? ` · ${atrasados} com prazo vencido` : '')} acao="Resolver →" />);
  }
  for (const p of pedidos) {
    const proj = d.iniciativas.find((i) => i.id === p.iniciativaId);
    itens.push(<ItemAcao key={p.id} href="/area/time" titulo="Pedido de alocação" sub={`${proj?.titulo ?? ''} pede +${p.deltaPct}% de ${pessoa(d, p.pessoaId)?.nome ?? ''}${p.aPartirDe ? ` a partir de ${p.aPartirDe}` : ''}`} acao="Responder →" />);
  }
  for (const x of acima) {
    itens.push(<ItemAcao key={x.p.id} href="/area/time" titulo={`${x.p.nome} está acima do que você cedeu`} sub={`${x.aloc}% em projetos, limite de ${x.p.cedeAte}%`} acao="Ajustar →" />);
  }

  const minhas = new Set(areasSobGestao(eu.id, d.areas));
  const daArea = d.iniciativas.filter((i) => i.areaId && minhas.has(i.areaId));
  const projetos = daArea.filter((i) => noRaia(d, i, 'exe'));
  const nPre = daArea.filter((i) => noRaia(d, i, 'pre')).length;
  const nBkl = daArea.filter((i) => noRaia(d, i, 'bkl')).length;
  const ciclo = cicloAtual(d);
  const doCiclo = ciclo ? daArea.filter((i) => i.cicloId === ciclo.id && i.enviadaEm && i.solStatus !== 'rascunho') : [];
  const aprovadasPorMim = doCiclo.filter((i) => i.aprovadorId === eu.id && i.aprovadaGestorEm).length;
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
        <Link href="/area/projetos" style={sCard}>
          <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Projetos da área</h2>
          {projetos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum projeto em execução.</span>}
          {projetos.map((p) => (
            <span key={p.id} style={s('font-size: 13px; display: flex; justify-content: space-between; align-items: center; gap: 8px')}><span>{p.titulo}</span><PillFarol farol={p.farol} ponto={false} /></span>
          ))}
          {(nPre > 0 || nBkl > 0) && <span style={s('font-size: 12px; color: #5E5770')}>+ {nPre} em pré-projeto e {nBkl} no backlog</span>}
        </Link>
        {ciclo && (
          <Link href="/area/iniciativas" style={{ ...sCard, gap: 10 }}>
            <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1; letter-spacing: 0.3px')}>CICLO {ciclo.nome.toUpperCase()}</span>
            <span style={s('font-size: 15px; font-weight: 700')}>Sua área enviou {doCiclo.length} {doCiclo.length === 1 ? 'iniciativa' : 'iniciativas'}</span>
            <span style={s('font-size: 13px; color: #4A4458')}>{aprovadasPorMim} já {aprovadasPorMim === 1 ? 'aprovada' : 'aprovadas'} por você · {aguardando} aguardando{ciclo.etapa === 'inscricoes' ? ` · inscrições até ${br(ciclo.fechamento).slice(0, 5)}` : ''}</span>
          </Link>
        )}
        <Link href="/area/time" style={{ ...sCard, gap: 10 }}>
          <h2 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Time em projetos</h2>
          <span style={s('font-size: 26px; font-weight: 700')}>{alocados} de {time.length}</span>
          <span style={s('font-size: 13px; color: #4A4458')}>pessoas alocadas · média de {media}% do tempo</span>
        </Link>
      </div>
    </>
  );
}
