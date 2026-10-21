'use client';

import { useTransition } from 'react';
import { s } from '@/lib/css';
import { trocarVisao } from '@/app/acoes/sessao';

const off = s('padding: 5px 12px; border-radius: 14px; color: #E7E0FF; border: 1px solid #5A5270; background: transparent; font-size: 12px');
const on = s('padding: 5px 12px; border-radius: 14px; color: #FFFFFF; background: #6D4AFF; border: 1px solid #6D4AFF; font-weight: 600; font-size: 12px');

export function VerComo({ rotulo, perfis, ativo, personas, persona }: {
  rotulo: string;
  perfis: { id: string; rotulo: string }[];
  ativo: string;
  personas: { id: string; nome: string }[];
  persona: string;
}) {
  const [pend, start] = useTransition();
  return (
    <div style={s('flex: 0 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px; background: #26213A; color: #E7E0FF; font-size: 12px')}>
      <span style={s('font-weight: 600; margin-right: 4px')}>{rotulo}</span>
      {perfis.map((p) => (
        <button key={p.id} type="button" disabled={pend} aria-pressed={p.id === ativo} onClick={() => start(() => trocarVisao(p.id, ''))} style={p.id === ativo ? on : off}>{p.rotulo}</button>
      ))}
      {personas.length > 1 && (
        <label style={s('display: flex; align-items: center; gap: 6px; margin-left: 8px')}>
          <span>como</span>
          <select value={persona} disabled={pend} onChange={(e) => start(() => trocarVisao(ativo, e.target.value))}
            style={s('height: 28px; padding: 0 8px; border-radius: 14px; border: 1px solid #5A5270; background: #26213A; color: #E7E0FF; font-size: 12px')}>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
