'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { cobrarStatus } from '@/app/acoes/projeto';

export function BotaoCobrar({ ids }: { ids: string[] }) {
  const [feito, setFeito] = useState(false);
  const [pend, start] = useTransition();
  return (
    <button type="button" disabled={pend || feito} onClick={() => start(async () => { const r = await cobrarStatus(ids); if (r.ok) setFeito(true); })}
      style={s('border: 0; background: transparent; padding: 0; font-size: 13px; font-weight: 600; color: #4B2FD1; white-space: nowrap')}>
      {feito ? 'Cobrado ✓' : 'Cobrar →'}
    </button>
  );
}
