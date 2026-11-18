'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { trocarGp } from '@/app/acoes/iniciativas';
import { sErro } from '@/components/ui';

const sSel = s('height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');

/** PMO troca o gerente do projeto (quem era GP saiu ou mudou de função). */
export function TrocarGp({ iniciativaId, atual, atualNome, inativo, opcoes }: { iniciativaId: string; atual: string; atualNome: string; inativo: boolean; opcoes: { id: string; nome: string; gp: boolean }[] }) {
  const [v, setV] = useState(atual);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  return (
    <div role="group" aria-label="Gerente do projeto" style={{ ...s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; border-radius: 12px; font-size: 13px'), background: inativo ? '#FEF3DC' : '#FFFFFF', border: `1px solid ${inativo ? '#F0D9A8' : '#E2DCD0'}` }}>
      <strong>Gerente do projeto:</strong>
      <select aria-label="Escolher gerente do projeto" value={v} onChange={(e) => { setV(e.target.value); setMsg(null); }} style={sSel}>
        {!opcoes.some((o) => o.id === atual) && <option value={atual}>{atualNome}{inativo ? ' (desativado)' : ''}</option>}
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}{o.gp ? '' : ' (passa a ter o perfil GP)'}</option>)}
      </select>
      {v !== atual && <button type="button" disabled={pend} onClick={() => start(async () => { const r = await trocarGp(iniciativaId, v); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro }); })}
        style={s('height: 36px; padding: 0 14px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Trocar GP</button>}
      <span style={s('font-size: 12px; color: #5E5770; flex: 1 1 200px')}>{inativo ? 'O GP atual foi desativado: escolha quem assume o projeto.' : 'Troque quando o GP sair ou mudar de função. O novo e o antigo GP são avisados.'}</span>
      {msg && <span role={msg.ok ? 'status' : 'alert'} style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </div>
  );
}
