import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import type { Sessao } from '@/lib/sessao';
import { br, diffDias } from '@/lib/regras/datas';
import { areasSobGestao, gestorDe, timeDireto } from '@/lib/regras/pessoas';
import { alocacaoDe, cicloAtual, noRaia, pessoa, representados } from '@/lib/visoes';
import { PillFarol } from '@/components/ui';
import { ProjetosPatrocinados } from '@/components/ProjetosPatrocinados';
import { Saudacao } from './Saudacao';
import { CaixaUnica } from './CaixaUnica';

export function InicioGestor({ d, sessao, hoje }: { d: DadosOrg; sessao: Sessao; hoje: string }) {
  const eu = sessao.pessoa;
  const rep = representados(d, eu.id, hoje); // eu + gestores que me deixaram como substituto(a)
  const aprovacoes = d.iniciativas.filter((i) => noRaia(d, i, 'sol') && i.solStatus === 'aguardando_gestor' && !!i.aprovadorId && rep.has(i.aprovadorId))
    .sort((a, b) => (a.enviadaEm?.getTime() ?? 0) - (b.enviadaEm?.getTime() ?? 0));
  const urgentes = aprovacoes.filter((i) => i.tipo === 'obr' || i.urgencia === 'urg');
  const pedidos = d.pedidos.filter((p) => p.status === 'pendente' && rep.has(gestorDe(pessoa(d, p.pessoaId)!, d.areas) ?? ''));
  const time = timeDireto(eu.id, d.pessoas, d.areas);
  const alocTime = time.map((p) => ({ p, aloc: alocacaoDe(d, p.id, hoje) }));
  const espera = (iso: Date | null) => (iso ? Math.max(0, diffDias(hoje, iso.toISOString().slice(0, 10))) : 0);

  const pendentes = aprovacoes.length + pedidos.length;
  let texto = pendentes ? `Você tem ${pendentes} ${pendentes === 1 ? 'decisão pendente' : 'decisões pendentes'}.` : 'Nenhuma decisão pendente.';
  const obrig = urgentes.find((i) => i.tipo === 'obr');
  if (obrig) texto += ` Uma iniciativa obrigatória espera há ${espera(obrig.enviadaEm)} ${espera(obrig.enviadaEm) === 1 ? 'dia' : 'dias'}.`;

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
<CaixaUnica d={d} sessao={sessao} hoje={hoje} />
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
      <ProjetosPatrocinados d={d} pessoaId={eu.id} hoje={hoje} />
    </>
  );
}
