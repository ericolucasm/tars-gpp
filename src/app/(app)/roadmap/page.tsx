import Link from 'next/link';
import { exigirPerfil } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { br, diffDias, hojeISO } from '@/lib/regras/datas';
import { FAROL, type Farol } from '@/lib/regras/projeto';
import { roadmap } from '@/lib/roadmap';
import type { Busca } from '@/lib/relatorios';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { Cabecalho } from '@/components/ui';
import { FiltrosRelatorio } from '../relatorios/FiltrosRelatorio';

export const dynamic = 'force-dynamic';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LM = 92; // px por mês
const COL = 300; // coluna com o nome do projeto

export default async function Roadmap({ searchParams }: { searchParams: Promise<Busca> }) {
  const sessao = await exigirPerfil('pmo');
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const r = roadmap(d, hoje, await searchParams);
  const larg = r.meses.length * LM;
  const total = diffDias(r.janela.ate, r.janela.de) + 1;
  const x = (iso: string) => Math.max(0, Math.min(larg, (diffDias(iso, r.janela.de) / total) * larg));
  const cor = (l: (typeof r.linhas)[number]) => (l.farol ? FAROL[l.farol as Farol]?.fg : l.chave === 'con' ? '#9C8CF0' : '#6D4AFF');

  return (
    <Shell sessao={sessao} dados={d} atual="roadmap">
      <Cabecalho trilha="Gestão / Roadmap" titulo="Roadmap do portfólio" texto="Todos os projetos no tempo: barra do início ao fim previsto, na cor do farol. O losango ◆ marca os marcos; o traço cinza, o fim da linha de base." />
      <section id="roadmap" aria-label="Roadmap" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <FiltrosRelatorio rel="roadmap" filtros={r.filtros} caminho="/roadmap" />
        <div style={s('display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: #4A4458')}>
          {(['ok', 'aten', 'crit'] as Farol[]).map((f) => <span key={f} style={s('display: inline-flex; align-items: center; gap: 6px')}><span style={{ width: 18, height: 8, borderRadius: 4, background: FAROL[f].fg }} />{FAROL[f].rotulo}</span>)}
          <span style={s('display: inline-flex; align-items: center; gap: 6px')}><span style={{ width: 18, height: 8, borderRadius: 4, border: '2px dashed #6D4AFF', boxSizing: 'border-box' }} />Pré-projeto (datas desejadas)</span>
          <span style={s('display: inline-flex; align-items: center; gap: 6px')}><span style={{ width: 2, height: 12, background: '#B42318' }} />Hoje ({r.hojeBr})</span>
        </div>
        <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
          <div style={{ minWidth: COL + larg }}>
            <div style={s('display: flex; border-bottom: 1px solid #EFEBE3; background: #FAF8F4')}>
              <div style={{ ...s('padding: 8px 12px; font-size: 12px; font-weight: 600; color: #5E5770; box-sizing: border-box'), flex: `0 0 ${COL}px` }}>Projeto</div>
              {r.meses.map((m) => (
                <div key={m} style={{ ...s('padding: 8px; font-size: 12px; font-weight: 600; color: #4A4458; border-left: 1px solid #EFEBE3; box-sizing: border-box'), flex: `0 0 ${LM}px` }}>
                  {MES[Number(m.slice(5, 7)) - 1]}{m.endsWith('-01') || m === r.meses[0] ? ` ${m.slice(0, 4)}` : ''}
                </div>
              ))}
            </div>
            {r.linhas.map((l) => {
              const x0 = x(l.inicio), x1 = Math.max(x0 + 6, x(l.fim));
              return (
                <div key={l.id} role="row" aria-label={l.titulo} style={s('display: flex; border-bottom: 1px solid #F3F0EA')}>
                  <div style={{ ...s('padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; box-sizing: border-box; min-width: 0'), flex: `0 0 ${COL}px` }}>
                    {l.href ? <Link href={l.href} style={s('font-size: 13px; font-weight: 600; color: #26213A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{l.titulo}</Link>
                      : <span style={s('font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{l.titulo}</span>}
                    <span style={s('font-size: 11px; color: #5E5770; white-space: nowrap; overflow: hidden; text-overflow: ellipsis')}>{[l.area, l.etapa, l.gp && `GP ${l.gp}`].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div style={{ ...s('position: relative; height: 48px'), flex: `0 0 ${larg}px`, backgroundImage: 'linear-gradient(to right, #F3F0EA 1px, transparent 1px)', backgroundSize: `${LM}px 48px` }}>
                    <div title={`${l.titulo}: ${br(l.inicio)} a ${br(l.fim)}${l.estimado ? ' (datas desejadas)' : ''}`}
                      style={{ ...s('position: absolute; top: 15px; height: 18px; border-radius: 6px; box-sizing: border-box'), left: x0, width: x1 - x0, background: l.estimado ? 'transparent' : cor(l), border: l.estimado ? `2px dashed ${cor(l)}` : 'none', opacity: l.chave === 'pau' ? 0.55 : 1 }} />
                    {l.fimBase && l.fimBase !== l.fim && <div title={`Fim da linha de base: ${br(l.fimBase)}`} style={{ ...s('position: absolute; top: 11px; width: 2px; height: 26px; background: #8A8296'), left: x(l.fimBase) }} />}
                    {l.marcos.map((m) => (
                      <div key={m.nome + m.data} title={`Marco: ${m.nome} · ${br(m.data)} · ${m.status}`}
                        style={{ ...s('position: absolute; top: 18px; width: 10px; height: 10px; transform: rotate(45deg); border: 2px solid #FFFFFF; box-sizing: border-box'), left: x(m.data) - 5, background: m.status === 'Atingido' ? '#17723D' : m.status === 'Em risco' ? '#C27A0A' : '#26213A' }} />
                    ))}
                    <div style={{ ...s('position: absolute; top: 0; bottom: 0; width: 2px; background: #B42318; opacity: 0.6'), left: x(hoje) }} />
                  </div>
                </div>
              );
            })}
            {r.linhas.length === 0 && <div style={s('padding: 16px 12px; font-size: 13px; color: #5E5770')}>Nenhum projeto com esses filtros.</div>}
          </div>
        </div>
        {r.semDatas.length > 0 && <span style={s('font-size: 12px; color: #5E5770')}>Sem datas para aparecer no roadmap: {r.semDatas.join(' · ')}.</span>}
      </section>
    </Shell>
  );
}
