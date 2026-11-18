'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { moverCard } from '@/app/acoes/esteira';
import { sBtnPrim, sBtnSec, sErro } from '@/components/ui';

export type ConclusaoVM = {
  paraRaiaId: string; titulo: string; dica: string; confirmar: string;
  criterios: { texto: string; obrigatorio: boolean }[];
  pronto: boolean; // todas as fases tiveram o fim confirmado
};

/** Gate de conclusão na página do projeto: o mesmo checklist do Portfólio, para quem confirma a passagem (GP ou PMO). */
export function ConcluirProjeto({ iniciativaId, c, aoConcluir }: { iniciativaId: string; c: ConclusaoVM; aoConcluir: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [marcados, setMarcados] = useState(c.criterios.map(() => false));
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();

  function confirmar() {
    start(async () => {
      const r = await moverCard({ iniciativaId, tipo: 'avancar', paraRaiaId: c.paraRaiaId, marcados });
      if (!r.ok) setErro(r.erro);
      else aoConcluir();
    });
  }

  return (
    <div role="group" aria-label="Concluir o projeto" style={s('display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 12px; border: 1px solid #D9CFFF; background: #F7F4FF')}>
      <div style={s('display: flex; align-items: center; gap: 12px; flex-wrap: wrap')}>
        <span style={s('flex: 1 1 260px; font-size: 13px; color: #4A4458')}>
          {c.pronto ? <><strong>Todas as fases foram confirmadas.</strong> Se a entrega foi aceita, conclua o projeto.</> : 'Quando a entrega for aceita por quem pediu, conclua o projeto aqui.'}
        </span>
        {!aberto && <button type="button" onClick={() => setAberto(true)} style={sBtnPrim}>{c.titulo}</button>}
      </div>
      {aberto && (
        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <span style={s('font-size: 13px; color: #4A4458')}>{c.dica}</span>
          {c.criterios.map((cr, i) => (
            <label key={i} style={s('display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid #E8E3D9; background: #FFFFFF; font-size: 14px; cursor: pointer')}>
              <input type="checkbox" checked={marcados[i]} onChange={() => { setMarcados(marcados.map((m, j) => (j === i ? !m : m))); setErro(''); }} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />
              <span style={s('flex: 1')}>{cr.texto}</span>
              {!cr.obrigatorio && <span style={s('font-size: 11px; color: #5E5770')}>opcional</span>}
            </label>
          ))}
          {erro && <span role="alert" style={sErro}>{erro}</span>}
          <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
            <button type="button" onClick={() => { setAberto(false); setErro(''); }} style={sBtnSec}>Voltar</button>
            <button type="button" disabled={pend} onClick={confirmar} style={sBtnPrim}>{c.confirmar}</button>
          </div>
        </div>
      )}
    </div>
  );
}
