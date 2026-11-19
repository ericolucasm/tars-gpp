import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO } from '@/lib/regras/datas';
import { s } from '@/lib/css';
import { chaveDaRaia, infoProjeto, nomeArea, pessoa } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { Barra, Cabecalho, PillFarol } from '@/components/ui';
import { normalizarFiltro, passaNoFiltro, type SituacaoProjeto } from '@/lib/regras/filtro-projetos';
import { FiltrosProjetos } from './FiltrosProjetos';

export const dynamic = 'force-dynamic';

const ORDEM: Record<string, number> = { crit: 0, aten: 1, ok: 2 };

export default async function Projetos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sessao = await exigirPerfil('pmo', 'gp');
  const ehGp = sessao.perfil === 'gp'; // o GP vê só os projetos que gerencia
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const todos = d.iniciativas.filter((i) => i.inicioProjeto && ['exe', 'pau', 'con'].includes(chaveDaRaia(d, i.raiaId) ?? '') && (!ehGp || i.gpId === sessao.pessoa.id));
  // Filtros (no endereço): busca, situação, farol, área, GP e período em que o projeto esteve ativo
  const filtro = normalizarFiltro(await searchParams);
  const projetos = todos.filter((i) => passaNoFiltro({
    titulo: i.titulo, areaId: i.areaId, gpId: i.gpId, farol: i.farol,
    situacao: chaveDaRaia(d, i.raiaId) as SituacaoProjeto,
    inicio: i.inicioProjeto!,
    fim: i.concluidaEm?.toISOString().slice(0, 10) ?? infoProjeto(d, i, hoje).fimPrevisto,
  }, filtro));
  // opções só com o que existe na lista da pessoa, em ordem alfabética (sem opções que dariam lista vazia)
  const opcoes = (ids: (string | null)[], nome: (id: string) => string) => [...new Set(ids.filter((x): x is string => !!x))].map((id) => ({ id, nome: nome(id) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const areas = opcoes(todos.map((i) => i.areaId), (id) => nomeArea(d, id));
  const gps = opcoes(todos.map((i) => i.gpId), (id) => pessoa(d, id)?.nome ?? '—');
  const grupos: [string, typeof projetos][] = [
    ['Em execução', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'exe').sort((a, b) => (ORDEM[a.farol ?? 'ok'] ?? 3) - (ORDEM[b.farol ?? 'ok'] ?? 3))],
    ['Pausados', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'pau')],
    ['Concluídos', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'con')],
  ];

  return (
    <Shell sessao={sessao} dados={d} atual="projetos">
      {ehGp
        ? <Cabecalho trilha="Meus projetos" titulo="Meus projetos" texto="Os projetos que você gerencia: em execução, pausados e concluídos. Nos concluídos, você ainda registra lições, dá o feedback da equipe e mede o benefício." />
        : <Cabecalho trilha="Gestão / Projetos" titulo="Projetos" texto="Todos os projetos do portfólio. Abra um projeto para ver a linha do tempo, as pessoas e o status." />}
      {todos.length > 0 && <FiltrosProjetos filtro={filtro} areas={areas} gps={gps} total={todos.length} mostrados={projetos.length} />}
      {grupos.filter(([, l]) => l.length).map(([titulo, lista]) => (
        <section key={titulo} style={s('display: flex; flex-direction: column; gap: 12px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo} <span style={s('font-size: 13px; color: #5E5770; font-weight: 500')}>({lista.length})</span></h2>
          <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px')}>
            {lista.map((i) => {
              const info = infoProjeto(d, i, hoje);
              const gp = pessoa(d, i.gpId);
              const c = chaveDaRaia(d, i.raiaId);
              return (
                <Link key={i.id} href={`/projetos/${i.id}`} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 10px; color: #26213A')}>
                  <div style={s('display: flex; justify-content: space-between; gap: 8px; align-items: center')}>
                    <span style={s('font-size: 16px; font-weight: 700')}>{i.titulo}</span>
                    {c !== 'con' ? <PillFarol farol={i.farol} /> : <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>Entregue</span>}
                  </div>
                  <span style={s('font-size: 12px; color: #5E5770')}>{nomeArea(d, i.areaId)} · GP: {gp?.nome ?? '—'}{c === 'exe' ? ` · fase atual: ${info.faseAtual?.nome ?? '—'}` : ''}</span>
                  <Barra pct={info.progresso} />
                  <span style={s('font-size: 13px; color: #4A4458')}>
                    {info.progresso}% concluído · {c === 'con' ? `entregue em ${br(i.concluidaEm?.toISOString().slice(0, 10))}` : c === 'pau' ? `pausado: ${i.motivoSaida ?? '—'}` : `fim previsto ${br(info.fimPrevisto)}`}
                    {c === 'exe' && info.statusAtrasado && <> · <strong style={s('color: #9A5B05')}>status atrasado</strong></>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {todos.length > 0 && projetos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum projeto com esses filtros.</span>}
      {todos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>{ehGp ? 'Você ainda não gerencia nenhum projeto. Você vira GP quando o PMO te escolhe no play de um pré-projeto.' : 'Nenhum projeto ainda. Projetos nascem quando o PMO dá o play num pré-projeto.'}</span>}
    </Shell>
  );
}
