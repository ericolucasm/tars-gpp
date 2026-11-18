import Link from 'next/link';
import { s } from '@/lib/css';
import { GRUPOS_NOVIDADE, grupoNovidade } from '@/lib/regras/novidades';
import type { Novidade } from '@/lib/novidades';
import { BotaoLerTodas } from './BotaoLerTodas';

/** Lista de avisos agrupada por data. Não lidos em destaque; abrir um aviso marca como lido e leva ao lugar certo. */
export function ListaNovidades({ itens, hoje, podeMarcar }: { itens: Novidade[]; hoje: string; podeMarcar: boolean }) {
  return (
    <div style={s('display: flex; flex-direction: column; gap: 10px')}>
      {GRUPOS_NOVIDADE.map((g) => {
        const doGrupo = itens.filter((n) => grupoNovidade(n.dia, hoje) === g);
        if (!doGrupo.length) return null;
        return (
          <div key={g} role="group" aria-label={`Novidades: ${g}`} style={s('display: flex; flex-direction: column; gap: 6px')}>
            <span style={s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px')}>{g.toUpperCase()}</span>
            {doGrupo.map((n) => (
              <Link key={n.id} href={`/novidades/abrir/${n.id}`} prefetch={false}
                style={{ ...s('display: flex; gap: 10px; align-items: baseline; padding: 9px 12px; border-radius: 10px; font-size: 13px; color: #26213A'), background: n.lida ? '#FFFFFF' : '#F7F4FF', border: `1px solid ${n.lida ? '#EFEBE3' : '#DCD2FF'}` }}>
                <span aria-label={n.lida ? 'lida' : 'não lida'} style={{ ...s('width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px'), background: n.lida ? 'transparent' : '#6D4AFF' }} />
                <span style={{ flex: 1, fontWeight: n.lida ? 400 : 600, color: n.lida ? '#5E5770' : '#26213A' }}>{n.texto}</span>
                <span style={s('font-size: 11px; color: #8A8296; white-space: nowrap')}>{g === 'Hoje' || g === 'Ontem' ? n.hora : `${n.dia.slice(8, 10)}/${n.dia.slice(5, 7)}`}</span>
              </Link>
            ))}
          </div>
        );
      })}
      {itens.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhuma novidade por enquanto.</span>}
      {!podeMarcar && itens.length > 0 && <span style={s('font-size: 12px; color: #8A8296')}>No "ver como", os avisos da pessoa ficam como estão (lidos ou não).</span>}
    </div>
  );
}

/** Bloco "Novidades" do Meu TARS: os não lidos (até 5) e o link para o histórico. */
export function PainelNovidades({ itens, naoLidas, hoje, podeMarcar }: { itens: Novidade[]; naoLidas: number; hoje: string; podeMarcar: boolean }) {
  const mostrar = (naoLidas ? itens.filter((n) => !n.lida) : itens).slice(0, 5);
  return (
    <section aria-label="Novidades" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700; flex: 1')}>Novidades {naoLidas > 0 && <span style={s('font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; vertical-align: middle')}>{naoLidas} {naoLidas === 1 ? 'nova' : 'novas'}</span>}</h2>
        {naoLidas > 0 && podeMarcar && <BotaoLerTodas />}
        <Link href="/novidades" style={s('font-size: 13px; font-weight: 600; color: #4B2FD1')}>Ver histórico →</Link>
      </div>
      {naoLidas === 0 && itens.length > 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nada novo. Os últimos avisos:</span>}
      <ListaNovidades itens={mostrar} hoje={hoje} podeMarcar={podeMarcar} />
    </section>
  );
}
