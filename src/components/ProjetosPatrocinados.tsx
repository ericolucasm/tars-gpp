import Link from 'next/link';
import { s } from '@/lib/css';
import type { DadosOrg } from '@/lib/dados';
import { br } from '@/lib/regras/datas';
import { conclusaoPara, financeiroDo, infoProjeto, noRaia, pessoa } from '@/lib/visoes';
import { PillFarol } from './ui';

/** Início de quem patrocina projetos (qualquer perfil, exceto o PMO, que já vê tudo): os projetos rodando, com farol, custo e último status. */
export function ProjetosPatrocinados({ d, pessoaId, hoje }: { d: DadosOrg; pessoaId: string; hoje: string }) {
  const meus = d.iniciativas.filter((i) => i.patrocinadorId === pessoaId && i.inicioProjeto && noRaia(d, i, 'exe', 'pau'));
  if (!meus.length) return null;
  return (
    <section aria-label="Projetos que você patrocina" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Projetos que você patrocina</h2>
      {meus.map((i) => {
        const info = infoProjeto(d, i, hoje);
        const f = financeiroDo(d, i);
        const mud = d.pedidosMudanca.filter((m) => m.iniciativaId === i.id && m.status === 'pendente').length;
        const aceite = conclusaoPara(d, i, pessoaId, false);
        const alertas = [
          aceite?.pronto ? 'todas as fases confirmadas: aguardando o seu aceite para concluir' : null,
          f.situacao === 'crit' ? 'custo estourando' : f.situacao === 'aten' ? 'custo acima do orçado' : null,
          info.statusAtrasado ? 'status atrasado' : null,
          mud ? `${mud} ${mud === 1 ? 'mudança aguardando' : 'mudanças aguardando'} o PMO` : null,
        ].filter(Boolean);
        return (
          <Link key={i.id} href={`/projetos/${i.id}`} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #EFEBE3; color: #26213A')}>
            <span style={s('display: flex; flex-direction: column; gap: 2px; flex: 1 1 260px')}>
              <span style={s('font-size: 14px; font-weight: 600')}>{i.titulo}</span>
              <span style={s('font-size: 12px; color: #5E5770')}>GP: {pessoa(d, i.gpId)?.nome ?? '—'} · fim previsto {br(info.fimPrevisto)} · {info.ultimoStatus ? `último status ${br(info.ultimoStatus.data).slice(0, 5)}` : 'sem status publicado'}</span>
              {alertas.length > 0 && <span style={s('font-size: 12px; font-weight: 600; color: #9A5B05')}>{alertas.join(' · ')}</span>}
            </span>
            {noRaia(d, i, 'exe') ? <PillFarol farol={i.farol} /> : <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>Pausado</span>}
            <span style={s('font-size: 13px; font-weight: 600; color: #4B2FD1')}>Acompanhar →</span>
          </Link>
        );
      })}
    </section>
  );
}
