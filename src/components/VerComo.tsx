'use client';

import { useTransition } from 'react';
import { s } from '@/lib/css';
import { trocarVisao, verComoPessoa } from '@/app/acoes/sessao';

const off = s('padding: 5px 12px; border-radius: 14px; color: #E7E0FF; border: 1px solid #5A5270; background: transparent; font-size: 12px');
const on = s('padding: 5px 12px; border-radius: 14px; color: #FFFFFF; background: #6D4AFF; border: 1px solid #6D4AFF; font-weight: 600; font-size: 12px');

type Grupo = { titulo: string; personas: { id: string; rotulo: string }[] };

export function VerComo({ perfis, ativo, grupos, persona }: {
  perfis: { id: string; rotulo: string }[];
  ativo: string;
  grupos: Grupo[]; // vazio para quem não é admin
  persona: string;
}) {
  const [pend, start] = useTransition();
  return (
    <div style={s('flex: 0 0 auto; width: 100%; box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px; background: #26213A; color: #E7E0FF; font-size: 12px')}>
      {grupos.length > 0 && (
        <label style={s('display: flex; align-items: center; gap: 6px; margin-right: 8px')}>
          <span style={s('font-weight: 600')}>Admin · ver como</span>
          <select value={persona} disabled={pend} onChange={(e) => start(() => verComoPessoa(e.target.value))}
            style={s('height: 28px; max-width: 100%; padding: 0 8px; border-radius: 14px; border: 1px solid #5A5270; background: #26213A; color: #E7E0FF; font-size: 12px')}>
            {grupos.map((g) => (
              <optgroup key={g.titulo} label={g.titulo}>
                {g.personas.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      {perfis.length > 1 && (
        <>
          <span style={s('font-weight: 600; margin-right: 4px')}>{grupos.length > 0 ? 'Perfil:' : 'Ver como:'}</span>
          {perfis.map((p) => (
            <button key={p.id} type="button" disabled={pend} aria-pressed={p.id === ativo} onClick={() => start(() => trocarVisao(p.id))} style={p.id === ativo ? on : off}>{p.rotulo}</button>
          ))}
        </>
      )}
    </div>
  );
}
