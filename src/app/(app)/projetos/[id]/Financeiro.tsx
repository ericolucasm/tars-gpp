'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { definirOrcamento, definirPrevisao, lancarCusto, removerLancamento } from '@/app/acoes/financeiro';
import { sBtnPrim, sBtnSec, sInput, sLabel, sErro } from '@/components/ui';

type Lanc = { id: string; data: string; descricao: string; valor: string; autor: string };
type Props = {
  iniciativaId: string; hoje: string; ehPmo: boolean;
  orcado: string; realizado: string; previsao: string; consumoPct: number; concluidoPct: number; desvioPct: number; situacao: 'ok' | 'aten' | 'crit';
  previsaoValor: number; orcadoValor: number; lancamentos: Lanc[];
};
const TOM = { ok: ['#E3F5EA', '#17723D', 'Dentro do orçamento'], aten: ['#FEF3DC', '#9A5B05', 'Previsão acima do orçamento'], crit: ['#FDE8E8', '#B42318', 'Estouro de orçamento'] } as const;
const sKpi = s('background: #F7F5F0; border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px');
const soDigitos = (v: string) => v.replace(/\D/g, '');

export function Financeiro(p: Props) {
  const [data, setData] = useState(p.hoje);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [prev, setPrev] = useState(String(Math.round(p.previsaoValor)));
  const [orc, setOrc] = useState(String(Math.round(p.orcadoValor)));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, depois?: () => void) =>
    start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro ?? '' }); if (r.ok) depois?.(); });
  const [bg, fg, rot] = p.orcadoValor > 0 ? TOM[p.situacao] : (['#EDEAE3', '#4A4458', 'Orçamento não definido'] as const);

  return (
    <section id="financeiro" aria-label="Financeiro" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: flex-start')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Financeiro</h2>
          <span style={s('font-size: 12px; color: #5E5770')}>Orçamento aprovado, custo já realizado e quanto o GP prevê gastar até o fim.</span>
        </div>
        <span style={{ ...s('font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 10px'), background: bg, color: fg }}>{rot}</span>
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px')}>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Orçado</span><span style={s('font-size: 20px; font-weight: 700')}>{p.orcado}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Realizado</span><span style={s('font-size: 20px; font-weight: 700')}>{p.realizado}</span><span style={s('font-size: 11px; color: #5E5770')}>{p.consumoPct}% do orçado · {p.concluidoPct}% das tarefas prontas</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Previsto no fim</span><span style={{ ...s('font-size: 20px; font-weight: 700'), color: p.situacao === 'ok' ? '#26213A' : fg }}>{p.previsao}</span><span style={s('font-size: 11px; color: #5E5770')}>{p.desvioPct > 0 ? `+${p.desvioPct}% sobre o orçado` : p.desvioPct < 0 ? `${p.desvioPct}% abaixo do orçado` : 'igual ao orçado'}</span></div>
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; align-items: end')}>
        <label style={sLabel}>Previsão de custo total (R$)
          <span style={s('display: flex; gap: 8px')}><input inputMode="numeric" value={prev} onChange={(e) => setPrev(soDigitos(e.target.value))} style={{ ...sInput, flex: 1 }} />
            <button type="button" disabled={pend} onClick={() => rodar(() => definirPrevisao(p.iniciativaId, Number(prev)))} style={sBtnSec}>Atualizar previsão</button></span>
        </label>
        {p.ehPmo && (
          <label style={sLabel}>Orçamento aprovado (R$) · só PMO
            <span style={s('display: flex; gap: 8px')}><input inputMode="numeric" value={orc} onChange={(e) => setOrc(soDigitos(e.target.value))} style={{ ...sInput, flex: 1 }} />
              <button type="button" disabled={pend} onClick={() => rodar(() => definirOrcamento(p.iniciativaId, Number(orc)))} style={sBtnSec}>Definir orçamento</button></span>
          </label>
        )}
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #EFEBE3; padding-top: 14px')}>
        <h3 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Lançar custo realizado</h3>
        <div style={s('display: grid; grid-template-columns: 150px 1fr 160px auto; gap: 8px; align-items: end')}>
          <label style={sLabel}>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} style={sInput} /></label>
          <label style={sLabel}>Descrição<input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Fatura do fornecedor – outubro" style={sInput} /></label>
          <label style={sLabel}>Valor (R$)<input inputMode="numeric" value={valor} onChange={(e) => setValor(soDigitos(e.target.value))} style={sInput} /></label>
          <button type="button" disabled={pend} onClick={() => rodar(() => lancarCusto(p.iniciativaId, { data, descricao, valor: Number(valor) }), () => { setDescricao(''); setValor(''); })} style={sBtnPrim}>Lançar</button>
        </div>
        {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
        {p.lancamentos.length > 0 ? (
          <div style={s('display: flex; flex-direction: column')}>
            {p.lancamentos.map((l) => (
              <div key={l.id} style={s('display: grid; grid-template-columns: 100px 1fr auto auto; gap: 10px; align-items: center; padding: 8px 4px; border-bottom: 1px solid #F3F0EA; font-size: 13px')}>
                <span style={s('color: #5E5770')}>{l.data}</span><span>{l.descricao} <span style={s('color: #8A8296; font-size: 12px')}>· {l.autor}</span></span>
                <span style={s('font-weight: 600')}>{l.valor}</span>
                <button type="button" aria-label={`Remover lançamento ${l.descricao}`} disabled={pend} onClick={() => rodar(() => removerLancamento(l.id))} style={s('width: 28px; height: 28px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
              </div>
            ))}
          </div>
        ) : <span style={s('font-size: 13px; color: #5E5770')}>Nenhum custo lançado ainda.</span>}
      </div>
    </section>
  );
}
