'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { definirPatrocinador } from '@/app/acoes/iniciativas';
import { sErro } from '@/components/ui';

const sSel = s('height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');

/** PMO indica ou troca o patrocinador do projeto (pessoa cadastrada com o perfil Patrocinador). */
export function Patrocinio({ iniciativaId, atual, texto, opcoes }: { iniciativaId: string; atual: string; texto: string | null; opcoes: { id: string; nome: string }[] }) {
  const [v, setV] = useState(atual);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  return (
    <div role="group" aria-label="Patrocinador do projeto" style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; border-radius: 12px; background: #FFFFFF; border: 1px solid #E2DCD0; font-size: 13px')}>
      <strong>Patrocinador:</strong>
      <select aria-label="Escolher patrocinador" value={v} onChange={(e) => { setV(e.target.value); setMsg(null); }} style={sSel}>
        <option value="">{texto ? `${texto} (só o nome, sem cadastro)` : 'Sem patrocinador'}</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
      {v !== atual && <button type="button" disabled={pend} onClick={() => start(async () => { const r = await definirPatrocinador(iniciativaId, v); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro }); })}
        style={s('height: 36px; padding: 0 14px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Salvar patrocinador</button>}
      <span style={s('font-size: 12px; color: #5E5770; flex: 1 1 200px')}>O patrocinador acompanha o projeto e recebe os status publicados.</span>
      {msg && <span role={msg.ok ? 'status' : 'alert'} style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </div>
  );
}
