'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { retirarIniciativa } from '@/app/acoes/iniciativas';
import { sErro, sInput, sLabel } from '@/components/ui';

const sBotao = s('height: 36px; padding: 0 12px; border-radius: 9px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #5E5770; font-size: 13px');

/** Quem pediu desiste: exclui o rascunho ou retira (devolvida/com o gestor) com um comentário. */
export function RetirarIniciativa({ id, titulo, tipo }: { id: string; titulo: string; tipo: 'excluir' | 'cancelar' }) {
  const [aberto, setAberto] = useState(false);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const rotulo = tipo === 'excluir' ? 'Excluir rascunho' : 'Retirar';
  if (!aberto) return <button type="button" onClick={() => setAberto(true)} style={sBotao}>{rotulo}</button>;
  return (
    <div role="group" aria-label={`${rotulo}: ${titulo}`} style={s('flex: 1 1 100%; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 10px; background: #F7F5F0')}>
      {tipo === 'cancelar'
        ? <label style={sLabel}>Por que está retirando?<input value={comentario} onChange={(e) => { setComentario(e.target.value); setErro(''); }} placeholder="Ex.: o problema foi resolvido de outro jeito" style={sInput} /></label>
        : <span style={s('font-size: 13px; color: #4A4458')}>O rascunho nunca foi enviado. Ele será apagado.</span>}
      {erro && <span role="alert" style={sErro}>{erro}</span>}
      <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
        <button type="button" onClick={() => { setAberto(false); setErro(''); }} style={sBotao}>Voltar</button>
        <button type="button" disabled={pend} onClick={() => start(async () => { const r = await retirarIniciativa(id, comentario); if (!r.ok) setErro(r.erro); })}
          style={s('height: 36px; padding: 0 14px; border-radius: 9px; border: 0; background: #B42318; color: #FFFFFF; font-weight: 600; font-size: 13px')}>{tipo === 'excluir' ? 'Confirmar: excluir' : 'Confirmar: retirar'}</button>
      </div>
    </div>
  );
}
