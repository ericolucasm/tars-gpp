'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { definirBeneficio, registrarMedicao } from '@/app/acoes/beneficios';
import { estiloPill, sBtnPrim, sBtnSec, sInput, sLabel, sErro } from '@/components/ui';

export type BeneficioVM = {
  id: string; titulo: string; href: string | null; indicador: string; meta: string; medirEm: string; medirEmIso: string;
  situacao: 'sem' | 'aguardando' | 'medir' | 'medido'; resultado: string; atingido: string; atingidoRotulo: string; medidoPor: string; medidoEm: string;
  podeEditar: boolean; podeMedir: boolean;
};
const SIT: Record<string, [string, string, string]> = {
  sem: ['#EDEAE3', '#4A4458', 'Sem benefício definido'], aguardando: ['#EDEAE3', '#4A4458', 'Aguardando a data de medir'],
  medir: ['#FEF3DC', '#9A5B05', 'Hora de medir'], sim: ['#E3F5EA', '#17723D', 'Atingido'], parcial: ['#FEF3DC', '#9A5B05', 'Parcialmente atingido'], nao: ['#FDE8E8', '#B42318', 'Não atingido'],
};

export function CartaoBeneficio({ b, comTitulo }: { b: BeneficioVM; comTitulo?: boolean }) {
  const [editar, setEditar] = useState(false);
  const [medir, setMedir] = useState(false);
  const [v, setV] = useState({ indicador: b.indicador, meta: b.meta, medirEm: b.medirEmIso });
  const [m, setM] = useState({ resultado: '', atingido: '' });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, depois: () => void) =>
    start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro ?? '' }); if (r.ok) depois(); });
  const sit = SIT[b.situacao === 'medido' ? b.atingido : b.situacao];
  return (
    <article aria-label={`Benefício de ${b.titulo}`} style={s('border: 1px solid #EFEBE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between')}>
        {comTitulo ? (b.href ? <Link href={b.href} style={s('font-size: 15px; font-weight: 600')}>{b.titulo}</Link> : <span style={s('font-size: 15px; font-weight: 600')}>{b.titulo}</span>) : <span />}
        <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: sit[0], color: sit[1] }}>{sit[2]}</span>
      </div>
      {b.situacao !== 'sem' ? (
        <dl style={s('margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px 16px')}>
          {[['Indicador', b.indicador], ['Meta', b.meta], ['Medir em', b.medirEm || '—'], ...(b.situacao === 'medido' ? [['Resultado medido', `${b.resultado} (${b.medidoPor}, ${b.medidoEm})`]] : [])].map(([k, x]) => (
            <div key={k} style={s('display: flex; flex-direction: column; gap: 2px')}><dt style={s('font-size: 11px; color: #5E5770')}>{k}</dt><dd style={s('margin: 0; font-size: 13px')}>{x}</dd></div>
          ))}
        </dl>
      ) : <span style={s('font-size: 13px; color: #5E5770')}>Ninguém definiu ainda como medir o resultado desta iniciativa.</span>}
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
        {b.podeEditar && <button type="button" onClick={() => { setEditar(!editar); setMedir(false); }} style={sBtnSec}>{b.situacao === 'sem' ? 'Definir benefício' : 'Ajustar benefício'}</button>}
        {b.podeMedir && b.situacao !== 'sem' && <button type="button" onClick={() => { setMedir(!medir); setEditar(false); }} style={b.situacao === 'medir' ? sBtnPrim : sBtnSec}>{b.situacao === 'medido' ? 'Corrigir resultado' : 'Registrar resultado'}</button>}
      </div>
      {editar && (
        <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; align-items: end; padding: 12px; border-radius: 10px; background: #F7F5F0')}>
          <label style={sLabel}>Indicador<input value={v.indicador} onChange={(e) => setV({ ...v, indicador: e.target.value })} style={sInput} /></label>
          <label style={sLabel}>Meta<input value={v.meta} onChange={(e) => setV({ ...v, meta: e.target.value })} style={sInput} /></label>
          <label style={sLabel}>Medir em<input type="date" value={v.medirEm} onChange={(e) => setV({ ...v, medirEm: e.target.value })} style={sInput} /></label>
          <button type="button" disabled={pend} onClick={() => rodar(() => definirBeneficio(b.id, v), () => setEditar(false))} style={sBtnPrim}>Salvar</button>
        </div>
      )}
      {medir && (
        <div style={s('display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 10px; background: #F7F5F0')}>
          <label style={sLabel}>Resultado medido ({b.indicador})<input value={m.resultado} onChange={(e) => setM({ ...m, resultado: e.target.value })} placeholder="Ex.: 14 minutos em média" style={sInput} /></label>
          <div role="group" aria-label="A meta foi atingida?" style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            {([['sim', 'Atingida'], ['parcial', 'Parcialmente'], ['nao', 'Não atingida']] as const).map(([k, r]) => <button key={k} type="button" aria-pressed={m.atingido === k} onClick={() => setM({ ...m, atingido: k })} style={estiloPill(m.atingido === k)}>{r}</button>)}
          </div>
          <div><button type="button" disabled={pend} onClick={() => rodar(() => registrarMedicao(b.id, m), () => setMedir(false))} style={sBtnPrim}>Salvar resultado</button></div>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </article>
  );
}
