'use client';

import { useTransition } from 'react';
import { s } from '@/lib/css';
import { marcarTodasLidas } from '@/app/acoes/novidades';

export function BotaoLerTodas() {
  const [pend, start] = useTransition();
  return (
    <button type="button" disabled={pend} onClick={() => start(async () => { await marcarTodasLidas(); })}
      style={s('height: 32px; padding: 0 12px; border-radius: 9px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 12px')}>Marcar todas como lidas</button>
  );
}
