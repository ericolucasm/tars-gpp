'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { adicionarDependencia, removerDependencia } from '@/app/acoes/dependencias';
import { sBtnPrim, sBtnSec, sInput, sLabel, sErro } from '@/components/ui';

export type DepVM = { id: string; outro: string; outroHref: string | null; descricao: string; precisaAte: string; fimPrevisto: string; rotulo: string; tom: 'ok' | 'aten' | 'crit' | 'neutro' };
const COR = { ok: ['#E3F5EA', '#17723D'], aten: ['#FEF3DC', '#9A5B05'], crit: ['#FDE8E8', '#B42318'], neutro: ['#EDEAE3', '#4A4458'] };

function Linha({ x, remover }: { x: DepVM; remover?: () => void }) {
  return (
    <div role="group" aria-label={`Dependência: ${x.descricao}`} style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid #EFEBE3; border-radius: 10px')}>
      <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: COR[x.tom][0], color: COR[x.tom][1] }}>{x.rotulo}</span>
      <span style={s('flex: 1 1 260px; font-size: 13px')}>
        <strong>{x.descricao}</strong> · {x.outroHref ? <Link href={x.outroHref}>{x.outro}</Link> : x.outro}
        <span style={s('display: block; font-size: 12px; color: #5E5770')}>Precisa até {x.precisaAte} · fim previsto {x.fimPrevisto}</span>
      </span>
      {remover && <button type="button" aria-label={`Remover dependência ${x.descricao}`} onClick={remover} style={s('width: 30px; height: 30px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>}
    </div>
  );
}

export function Dependencias({ iniciativaId, podeEditar, dependeDe, dependemDeste, opcoes }: { iniciativaId: string; podeEditar: boolean; dependeDe: DepVM[]; dependemDeste: DepVM[]; opcoes: { id: string; nome: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [n, setN] = useState({ dependeDeId: '', descricao: '', precisaAte: '' });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, depois?: () => void) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro ?? '' }); if (r.ok) depois?.(); });
  return (
    <section id="dependencias" aria-label="Dependências" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Dependências</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Entregas de outros projetos de que este precisa, e quem precisa deste. Fica em risco quando o fim previsto do outro passa da data.</span>
      </div>
      <span style={s('font-size: 14px; font-weight: 700')}>Este projeto depende de</span>
      {dependeDe.map((x) => <Linha key={x.id} x={x} remover={podeEditar ? () => rodar(() => removerDependencia(x.id)) : undefined} />)}
      {dependeDe.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhuma dependência registrada.</span>}
      {podeEditar && !aberto && <div><button type="button" onClick={() => { setAberto(true); setMsg(null); }} style={sBtnSec}>Registrar dependência</button></div>}
      {aberto && (
        <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; align-items: end; padding: 12px; border-radius: 12px; background: #F7F5F0')}>
          <label style={sLabel}>Depende do projeto<select value={n.dependeDeId} onChange={(e) => setN({ ...n, dependeDeId: e.target.value })} style={sInput}><option value="">Escolha…</option>{opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
          <label style={sLabel}>O que precisa receber<input value={n.descricao} onChange={(e) => setN({ ...n, descricao: e.target.value })} placeholder="API de pedidos publicada" style={sInput} /></label>
          <label style={sLabel}>Precisa até<input type="date" value={n.precisaAte} onChange={(e) => setN({ ...n, precisaAte: e.target.value })} style={sInput} /></label>
          <div style={s('display: flex; gap: 8px')}>
            <button type="button" onClick={() => setAberto(false)} style={sBtnSec}>Cancelar</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => adicionarDependencia(iniciativaId, n), () => { setAberto(false); setN({ dependeDeId: '', descricao: '', precisaAte: '' }); })} style={sBtnPrim}>Registrar</button>
          </div>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
      {dependemDeste.length > 0 && <>
        <span style={s('font-size: 14px; font-weight: 700; margin-top: 4px')}>Projetos que dependem deste</span>
        {dependemDeste.map((x) => <Linha key={x.id} x={x} />)}
      </>}
    </section>
  );
}
