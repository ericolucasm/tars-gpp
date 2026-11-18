'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { decidirPrazo, definirCadencia } from '@/app/acoes/muro';
import { sBtnPrim, sBtnSec, sErro } from '@/components/ui';

type Fase = { id: string; nome: string; gate: string; responsavelId: string | null; confirmada: boolean; atraso: number };
type Pedido = { id: string; alvo: string; quem: string; de: string; para: string; motivo: string };
const sSel = s('height: 36px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');

export function Prazos(p: { iniciativaId: string; podeEditar: boolean; cadencia: string; dia: number; proximoStatus: string; statusAtrasado: boolean;
  fases: Fase[]; pessoas: { id: string; nome: string }[]; pedidos: Pedido[] }) {
  const [cad, setCad] = useState(p.cadencia);
  const [dia, setDia] = useState(p.dia);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro ?? '' }); });
  return (
    <section id="prazos" aria-label="Prazos e responsáveis" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Prazos e responsáveis</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>Quando o status deve ser publicado e quem confirma o fim de cada fase (o gate). Para mudar o responsável de uma fase, clique na barra dela na linha do tempo. Quem passa da data sem registrar nada vai para o Muro da vergonha, com aviso para a pessoa, o GP e o gestor dela.</span>
      </div>
      {p.pedidos.length > 0 && (
        <div style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; background: #FEF3DC')}>
          <span style={s('font-size: 13px; font-weight: 700; color: #6B3F03')}>Pedidos de mais prazo</span>
          {p.pedidos.map((x) => (
            <div key={x.id} role="group" aria-label={`Pedido de prazo: ${x.alvo}`} style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; color: #4A3205')}>
              <span style={s('flex: 1 1 280px')}><strong>{x.quem}</strong> pede para <strong>{x.alvo}</strong> passar de {x.de} para <strong>{x.para}</strong>: {x.motivo}</span>
              {p.podeEditar && <>
                <button type="button" disabled={pend} onClick={() => rodar(() => decidirPrazo(x.id, false))} style={sBtnSec}>Recusar</button>
                <button type="button" disabled={pend} onClick={() => rodar(() => decidirPrazo(x.id, true))} style={sBtnPrim}>Aprovar prazo</button>
              </>}
            </div>
          ))}
        </div>
      )}
      <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 13px')}>
        <strong>Status report:</strong>
        <select aria-label="Frequência do status" value={cad} disabled={!p.podeEditar} onChange={(e) => setCad(e.target.value)} style={sSel}>
          <option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal (a cada 4 semanas)</option>
        </select>
        <select aria-label="Dia do status" value={dia} disabled={!p.podeEditar} onChange={(e) => setDia(Number(e.target.value))} style={sSel}>
          {['segunda', 'terça', 'quarta', 'quinta', 'sexta'].map((n, k) => <option key={n} value={k + 1}>na {n}</option>)}
        </select>
        {p.podeEditar && (cad !== p.cadencia || dia !== p.dia) && <button type="button" disabled={pend} onClick={() => rodar(() => definirCadencia(p.iniciativaId, cad, dia))} style={sBtnPrim}>Salvar cadência</button>}
        <span style={{ color: p.statusAtrasado ? '#B42318' : '#5E5770', fontWeight: p.statusAtrasado ? 600 : 400 }}>Próximo status: {p.proximoStatus}{p.statusAtrasado ? ' (atrasado)' : ''}</span>
      </div>
      <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
        <table style={s('width: 100%; border-collapse: collapse; font-size: 13px; min-width: 560px')}>
          <thead><tr>{['Fase', 'Gate (fim da fase)', 'Responsável', 'Situação'].map((c) => <th key={c} scope="col" style={s('text-align: left; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #5E5770; background: #FAF8F4; border-bottom: 1px solid #EFEBE3')}>{c}</th>)}</tr></thead>
          <tbody>
            {p.fases.map((f) => (
              <tr key={f.id}>
                <th scope="row" style={s('text-align: left; padding: 8px 12px; border-bottom: 1px solid #F3F0EA')}>{f.nome}</th>
                <td style={s('padding: 8px 12px; border-bottom: 1px solid #F3F0EA')}>{f.gate}</td>
                <td style={s('padding: 8px 12px; border-bottom: 1px solid #F3F0EA')}>
                  {p.pessoas.find((x) => x.id === f.responsavelId)?.nome ?? 'GP do projeto'}
                </td>
                <td style={s('padding: 8px 12px; border-bottom: 1px solid #F3F0EA')}>
                  {f.confirmada ? <span style={s('color: #17723D; font-weight: 600')}>Confirmada</span> : f.atraso > 0 ? <span style={s('color: #B42318; font-weight: 600')}>{f.atraso} dia(s) de atraso</span> : <span style={s('color: #5E5770')}>No prazo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </section>
  );
}
