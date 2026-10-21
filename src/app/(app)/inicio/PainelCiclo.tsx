'use client';

import { useState } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import type { CicloVM } from '@/lib/ciclo-vm';

const ETAPAS = ['Inscrições', 'Gestores', 'Avaliação', 'Comunicação', 'Play'];

export function PainelCiclo({ ciclos }: { ciclos: CicloVM[] }) {
  const [sel, setSel] = useState(ciclos.find((c) => c.atual)?.id ?? ciclos[0].id);
  const c = ciclos.find((x) => x.id === sel) ?? ciclos[0];
  return (
    <section aria-label="Ciclo de planejamento" style={s('flex: 1 1 340px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
      <div style={s('display: flex; flex-direction: column; gap: 6px')}>
        <label htmlFor="ciclo-sel" style={s('font-size: 12px; font-weight: 700; color: #4B2FD1; letter-spacing: 0.3px')}>CICLO DE PLANEJAMENTO</label>
        <select id="ciclo-sel" value={sel} onChange={(e) => setSel(e.target.value)} style={s('height: 42px; padding: 0 10px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 14px; font-weight: 600')}>
          {ciclos.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.atual ? ' (atual)' : ''}</option>)}
        </select>
      </div>
      <div style={s('display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap')}>
        <span style={s('font-size: 15px; font-weight: 700')}>{c.headline}</span>
        <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: c.on ? '#E7E0FF' : '#EDEAE3', color: c.on ? '#4B2FD1' : '#4A4458' }}>{c.status}</span>
      </div>
      <span style={s('font-size: 12px; color: #5E5770')}>{c.janela}</span>
      <div style={s('display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px')}>
        {ETAPAS.map((n, i) => (
          <div key={n} style={s('display: flex; flex-direction: column; gap: 4px')}>
            <div style={{ height: 6, borderRadius: 3, background: i < c.etapa ? '#9C8CF0' : i === c.etapa ? '#6D4AFF' : '#EFEBE3' }} />
            <span style={s('font-size: 10px; color: #5E5770; line-height: 1.2')}>{n}</span>
          </div>
        ))}
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px')}>
        {c.numeros.map((n) => (
          <div key={n.rotulo} style={s('background: #F7F5F0; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px')}>
            <span style={s('font-size: 11px; color: #5E5770')}>{n.rotulo}</span><span style={s('font-size: 20px; font-weight: 700')}>{n.valor}</span>
          </div>
        ))}
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 6px; border-top: 1px solid #EFEBE3; padding-top: 12px')}>
        <span style={s('font-size: 12px; font-weight: 700')}>Orçamento</span>
        <div style={s('height: 8px; border-radius: 4px; background: #EFEBE3; overflow: hidden')}><div style={{ ...s('height: 8px; border-radius: 4px; background: #6D4AFF'), width: `${c.orcamentoPct}%` }} /></div>
        <span style={s('font-size: 12px; color: #4A4458')}>{c.orcamento}</span>
      </div>
      {c.blocos.map((b) => (
        <div key={b.titulo} style={s('display: flex; flex-direction: column; gap: 6px; border-top: 1px solid #EFEBE3; padding-top: 12px')}>
          <span style={s('font-size: 12px; font-weight: 700')}>{b.titulo}</span>
          {b.linhas.map((l) => <span key={l.k} style={s('font-size: 13px; display: flex; justify-content: space-between; gap: 8px')}><span>{l.k}</span><span style={s('font-weight: 700')}>{l.v}</span></span>)}
        </div>
      ))}
      <Link href={c.link} style={s('height: 40px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: center')}>{c.cta}</Link>
    </section>
  );
}
