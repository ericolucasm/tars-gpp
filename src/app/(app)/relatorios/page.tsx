import { exigirSessao } from '@/lib/sessao';
import { carregarOrg } from '@/lib/dados';
import { hojeISO, br } from '@/lib/regras/datas';
import { relatoriosDoPerfil, type Busca, type Celula, type Relatorio, type Tom } from '@/lib/relatorios';
import { s } from '@/lib/css';
import { Shell } from '@/components/Shell';
import { BotaoImprimir } from './BotaoImprimir';
import { FiltrosRelatorio } from './FiltrosRelatorio';

export const dynamic = 'force-dynamic';

const TEXTO: Record<string, string> = {
  pmo: 'Visão do portfólio inteiro: etapas, saúde dos projetos, ciclos, demanda por área e capacidade das pessoas.',
  gestor: 'Iniciativas, projetos e alocação do time da sua área.',
  gp: 'Andamento, tarefas e equipe dos projetos que você gerencia.',
  colaborador: 'Suas iniciativas e suas tarefas em projetos.',
};

const COR: Record<Tom, { bg: string; fg: string }> = {
  ok: { bg: '#E3F5EA', fg: '#17723D' },
  aten: { bg: '#FEF3DC', fg: '#9A5B05' },
  crit: { bg: '#FDE8E8', fg: '#B42318' },
  neutro: { bg: '#EDEAE3', fg: '#4A4458' },
};

function Cel({ c }: { c: Celula }) {
  if (typeof c === 'string') return <>{c}</>;
  return <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; white-space: nowrap'), background: COR[c.tom].bg, color: COR[c.tom].fg }}>{c.texto}</span>;
}

function SecaoRelatorio({ r }: { r: Relatorio }) {
  return (
    <section id={r.id} aria-label={r.titulo} style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px; break-inside: avoid')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{r.titulo}</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>{r.descricao}</span>
      </div>
      <FiltrosRelatorio rel={r.id} filtros={r.filtros} />
      {r.resumo.length > 0 && (
        <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px')}>
          {r.resumo.map((x) => (
            <div key={x.rotulo} style={s('background: #F7F5F0; border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px')}>
              <span style={s('font-size: 12px; color: #5E5770')}>{x.rotulo}</span>
              <span style={{ ...s('font-size: 20px; font-weight: 700'), color: x.tom && x.tom !== 'neutro' ? COR[x.tom].fg : '#26213A' }}>{x.valor}</span>
            </div>
          ))}
        </div>
      )}
      <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
        <table style={s('width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px')}>
          <thead>
            <tr>{r.colunas.map((c) => <th key={c} scope="col" style={s('text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: #5E5770; background: #FAF8F4; border-bottom: 1px solid #EFEBE3; white-space: nowrap')}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {r.linhas.map((l, i) => (
              <tr key={i}>
                {l.map((c, j) => j === 0
                  ? <th key={j} scope="row" style={s('text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #F3F0EA; vertical-align: top')}><Cel c={c} /></th>
                  : <td key={j} style={s('padding: 10px 12px; color: #4A4458; border-bottom: 1px solid #F3F0EA; vertical-align: top')}><Cel c={c} /></td>)}
              </tr>
            ))}
            {r.linhas.length === 0 && <tr><td colSpan={r.colunas.length} style={s('padding: 16px 12px; color: #5E5770')}>{r.vazio}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<Busca> }) {
  const sessao = await exigirSessao();
  const d = await carregarOrg(sessao.orgId);
  const hoje = hojeISO();
  const relatorios = relatoriosDoPerfil(d, sessao, hoje, await searchParams);

  return (
    <Shell sessao={sessao} dados={d} atual="relatorios">
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Relatórios · dados de {br(hoje)}</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Relatórios</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>{TEXTO[sessao.perfil]}</p>
        </div>
        <BotaoImprimir />
      </div>
      <nav aria-label="Relatórios desta página" data-sem-impressao style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
        {relatorios.map((r) => (
          <a key={r.id} href={`#${r.id}`} style={s('min-height: 36px; padding: 0 14px; border-radius: 18px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px; display: inline-flex; align-items: center')}>{r.titulo}</a>
        ))}
      </nav>
      {relatorios.map((r) => <SecaoRelatorio key={r.id} r={r} />)}
    </Shell>
  );
}
