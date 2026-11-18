'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { planejarItem } from '@/app/acoes/meu-tars';

const sSel = s('height: 32px; padding: 0 8px; border-radius: 8px; border: 1px solid #E2DCD0; font-size: 12px; color: #4A4458; background: #FFFFFF');

/** Organizar um item da caixa: hoje, esta semana, depois ou lembrar numa data. Só a própria pessoa. */
export function PlanoItem({ itemId, titulo, atual, amanha }: { itemId: string; titulo: string; atual: string; amanha: string }) {
  const [lembrar, setLembrar] = useState(false);
  const [data, setData] = useState(amanha);
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const salvar = (plano: string | null, adiarAte?: string) => start(async () => { const r = await planejarItem(itemId, { plano, adiarAte }); setErro(r.ok ? '' : r.erro); if (r.ok) setLembrar(false); });
  if (lembrar) {
    return (
      <span role="group" aria-label={`Lembrete: ${titulo}`} style={s('display: flex; gap: 6px; align-items: center; flex-wrap: wrap')}>
        <input type="date" aria-label="Lembrar em" value={data} min={amanha} onChange={(e) => setData(e.target.value)} style={sSel} />
        <button type="button" disabled={pend} onClick={() => salvar(null, data)} style={s('height: 32px; padding: 0 10px; border-radius: 8px; border: 0; background: #6D4AFF; color: #FFFFFF; font-size: 12px; font-weight: 600')}>Adiar</button>
        <button type="button" onClick={() => { setLembrar(false); setErro(''); }} style={s('height: 32px; padding: 0 8px; border-radius: 8px; border: 0; background: transparent; color: #5E5770; font-size: 12px')}>Voltar</button>
        {erro && <span role="alert" style={s('font-size: 12px; color: #B42318')}>{erro}</span>}
      </span>
    );
  }
  return (
    <span style={s('display: flex; gap: 6px; align-items: center')}>
      <select aria-label={`Planejar: ${titulo}`} value={atual} disabled={pend}
        onChange={(e) => { const v = e.target.value; if (v === 'lembrar') setLembrar(true); else salvar(v || null); }} style={sSel}>
        <option value="">{atual ? "Tirar do plano" : "Planejar…"}</option>
        <option value="hoje">Fazer hoje</option>
        <option value="semana">Esta semana</option>
        <option value="depois">Deixar para depois</option>
        <option value="lembrar">Lembrar em…</option>
      </select>
      {erro && <span role="alert" style={s('font-size: 12px; color: #B42318')}>{erro}</span>}
    </span>
  );
}
