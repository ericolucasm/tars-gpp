'use client';

import { useTransition } from 'react';
import { s } from '@/lib/css';
import { entrarDev } from '@/app/acoes/sessao';

export function BotaoDev({ id, nome, sub }: { id: string; nome: string; sub: string }) {
  const [pend, start] = useTransition();
  return (
    <button type="button" disabled={pend} onClick={() => start(() => entrarDev(id))}
      style={s('display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; padding: 10px 12px; border-radius: 12px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A')}>
      <span style={s('font-size: 14px; font-weight: 600')}>{nome}</span>
      <span style={s('font-size: 12px; color: #5E5770')}>{sub}</span>
    </button>
  );
}
