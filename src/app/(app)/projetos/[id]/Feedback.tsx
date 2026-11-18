'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { darFeedback } from '@/app/acoes/feedback';
import { NIVEIS_FEEDBACK } from '@/lib/regras/feedback';
import { estiloPill, sBtnPrim, sErro } from '@/components/ui';

export type MembroFeedback = { pessoaId: string; nome: string; area: string; fases: string; participacao: string; pendente: boolean; nivel: string | null; comentario: string };
const COR = { ok: ['#E3F5EA', '#17723D'], neutro: ['#EDEAE3', '#4A4458'], aten: ['#FEF3DC', '#9A5B05'] };

function Linha({ iniciativaId, m, podeEditar }: { iniciativaId: string; m: MembroFeedback; podeEditar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [nivel, setNivel] = useState(m.nivel ?? '');
  const [comentario, setComentario] = useState(m.comentario);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const n = m.nivel ? NIVEIS_FEEDBACK[m.nivel] : null;
  return (
    <div role="group" aria-label={`Contribuição de ${m.nome}`} style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid #EFEBE3; border-radius: 12px')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center')}>
        <span style={s('flex: 1 1 240px; display: flex; flex-direction: column')}>
          <span style={s('font-size: 14px; font-weight: 600')}>{m.nome}</span>
          <span style={s('font-size: 12px; color: #5E5770')}>{m.area} · {m.fases} · {m.participacao}</span>
        </span>
        {n ? <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: COR[n.tom][0], color: COR[n.tom][1] }}>{n.rotulo}</span>
          : m.pendente ? <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #FEF3DC; color: #9A5B05')}>Feedback pendente</span> : null}
        {podeEditar && <button type="button" onClick={() => { setAberto(!aberto); setMsg(null); }} style={s('border: 0; background: transparent; color: #4B2FD1; font-size: 12px; font-weight: 600; cursor: pointer')}>{aberto ? 'Fechar' : m.nivel ? 'Editar feedback' : 'Dar feedback'}</button>}
      </div>
      {m.comentario && !aberto && <span style={s('font-size: 13px; color: #4A4458')}>“{m.comentario}”</span>}
      {aberto && (
        <div style={s('display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: #F7F5F0')}>
          <div role="group" aria-label={`Como foi a contribuição de ${m.nome}`} style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
            {Object.entries(NIVEIS_FEEDBACK).map(([k, v]) => <button key={k} type="button" aria-pressed={nivel === k} onClick={() => setNivel(k)} style={estiloPill(nivel === k)}>{v.rotulo}</button>)}
          </div>
          <label style={s('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5E5770')}>Comentário para o gestor {nivel === 'abaixo' ? '(obrigatório)' : '(opcional)'}
            <textarea rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="O que a pessoa fez de bom e o que pode melhorar." style={s('padding: 8px 10px; border-radius: 8px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; resize: vertical')} />
          </label>
          <div><button type="button" disabled={pend} onClick={() => start(async () => {
            const r = await darFeedback(iniciativaId, m.pessoaId, nivel, comentario);
            setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro ?? '' });
            if (r.ok) setAberto(false);
          })} style={sBtnPrim}>Salvar feedback</button></div>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </div>
  );
}

/** Contribuição da equipe: o GP avalia cada pessoa cedida (vê: GP, gestor da pessoa e PMO; a pessoa não vê). */
export function Feedback({ iniciativaId, podeEditar, equipe }: { iniciativaId: string; podeEditar: boolean; equipe: MembroFeedback[] }) {
  return (
    <section id="feedback" aria-label="Contribuição da equipe" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Contribuição da equipe</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Como foi cada pessoa cedida ao projeto. Quem vê: o gestor da pessoa, o GP e o PMO (a pessoa não vê). Dê o feedback quando a participação da pessoa terminar: a Início avisa.</span>
      </div>
      {equipe.map((m) => <Linha key={m.pessoaId} iniciativaId={iniciativaId} m={m} podeEditar={podeEditar} />)}
      {equipe.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Ninguém da empresa alocado neste projeto ainda.</span>}
    </section>
  );
}
