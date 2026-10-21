import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, hojeISO } from '@/lib/regras/datas';
import { s } from '@/lib/css';
import { chaveDaRaia, infoProjeto, nomeArea, pessoa } from '@/lib/visoes';
import { Shell } from '@/components/Shell';
import { Barra, Cabecalho, PillFarol } from '@/components/ui';

export const dynamic = 'force-dynamic';

const ORDEM: Record<string, number> = { crit: 0, aten: 1, ok: 2 };

export default async function Projetos() {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const projetos = d.iniciativas.filter((i) => i.inicioProjeto && ['exe', 'pau', 'con'].includes(chaveDaRaia(d, i.raiaId) ?? ''));
  const grupos: [string, typeof projetos][] = [
    ['Em execução', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'exe').sort((a, b) => (ORDEM[a.farol ?? 'ok'] ?? 3) - (ORDEM[b.farol ?? 'ok'] ?? 3))],
    ['Pausados', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'pau')],
    ['Concluídos', projetos.filter((i) => chaveDaRaia(d, i.raiaId) === 'con')],
  ];

  return (
    <Shell sessao={sessao} dados={d} atual="projetos">
      <Cabecalho trilha="Gestão / Projetos" titulo="Projetos" texto="Todos os projetos do portfólio. Abra um projeto para ver a linha do tempo, as pessoas e o status." />
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
      {projetos.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum projeto ainda. Projetos nascem quando o PMO dá o play num pré-projeto.</span>}
    </Shell>
  );
}
