'use client';

import { useState } from 'react';
import { s } from '@/lib/css';
import { ESCALA, ESCALA_IMPACTO, STATUS_RISCO, nivelDoRisco } from '@/lib/regras/riscos';
import * as A from '@/app/acoes/projeto';

export type RiscoVM = { id: string; faseId: string; nome: string; nivel: string; probabilidade: number; impacto: number; responsavelId: string | null; plano: string; status: string };
type Rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, mostrar?: boolean) => void;

const sMini = s('height: 40px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');
const sMiniLab = s('display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600');
const sAdd = s('height: 40px; padding: 0 14px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px');
export function rkEstilo(nivel: string) {
  const c = nivel === 'Alto' ? ['#FDE8E8', '#B42318'] : nivel === 'Médio' ? ['#FEF3DC', '#9A5B05'] : ['#EDEAE3', '#4A4458'];
  return { ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; flex: 0 0 auto'), background: c[0], color: c[1] };
}

function Escala({ rotulo, valor, onChange, nomes }: { rotulo: string; valor: number; onChange: (v: number) => void; nomes: readonly string[] }) {
  return (
    <label style={{ ...sMiniLab, flex: '1 1 110px' }}>{rotulo}
      <select value={valor} onChange={(e) => onChange(Number(e.target.value))} style={sMini}>{[1, 2, 3].map((n) => <option key={n} value={n}>{nomes[n]}</option>)}</select>
    </label>
  );
}

function Risco({ r, equipe, rodar, pend }: { r: RiscoVM; equipe: { id: string; nome: string }[]; rodar: Rodar; pend: boolean }) {
  const [editar, setEditar] = useState(false);
  const [v, setV] = useState(r);
  const resp = equipe.find((x) => x.id === r.responsavelId)?.nome;
  const ativo = r.status === 'aberto' || r.status === 'ocorreu';
  const salvar = (x: RiscoVM) => rodar(() => A.atualizarRisco(r.id, { nome: x.nome, probabilidade: x.probabilidade, impacto: x.impacto, responsavelId: x.responsavelId, plano: x.plano, status: x.status }));
  return (
    <div aria-label={`Risco ${r.nome}`} role="group" style={{ ...s('display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid #EFEBE3'), opacity: ativo ? 1 : 0.65 }}>
      <div style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 8px')}>
        <span style={rkEstilo(r.nivel)}>{r.nivel}</span>
        <span style={s('flex: 1 1 200px; font-size: 13px; font-weight: 600')}>{r.nome}</span>
        <span style={s('font-size: 12px; color: #5E5770')}>Probabilidade {ESCALA[r.probabilidade].toLowerCase()} · impacto {ESCALA_IMPACTO[r.impacto].toLowerCase()}</span>
        <select aria-label={`Status do risco ${r.nome}`} value={r.status} disabled={pend} onChange={(e) => salvar({ ...r, status: e.target.value })} style={{ ...sMini, height: 32 }}>
          {Object.entries(STATUS_RISCO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <button type="button" onClick={() => { setV(r); setEditar(!editar); }} style={s('height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; font-size: 12px')}>{editar ? 'Fechar' : 'Editar'}</button>
        <button type="button" aria-label={`Remover risco ${r.nome}`} onClick={() => rodar(() => A.removerRisco(r.id))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
      </div>
      <span style={s('font-size: 12px; color: #4A4458')}>
        <strong>Responsável:</strong> {resp ?? <span style={s('color: #B42318')}>sem responsável</span>} · <strong>Plano de resposta:</strong> {r.plano || <span style={s('color: #B42318')}>sem plano</span>}
      </span>
      {editar && (
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; padding: 10px; border-radius: 10px; background: #F7F5F0')}>
          <label style={{ ...sMiniLab, flex: '2 1 180px' }}>Risco<input value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} style={sMini} /></label>
          <Escala rotulo="Probabilidade" valor={v.probabilidade} onChange={(n) => setV({ ...v, probabilidade: n })} nomes={ESCALA} />
          <Escala rotulo="Impacto" valor={v.impacto} onChange={(n) => setV({ ...v, impacto: n })} nomes={ESCALA_IMPACTO} />
          <label style={{ ...sMiniLab, flex: '1 1 150px' }}>Responsável
            <select value={v.responsavelId ?? ''} onChange={(e) => setV({ ...v, responsavelId: e.target.value || null })} style={sMini}><option value="">—</option>{equipe.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
          </label>
          <label style={{ ...sMiniLab, flex: '3 1 260px' }}>Plano de resposta<input value={v.plano} onChange={(e) => setV({ ...v, plano: e.target.value })} style={sMini} /></label>
          <button type="button" disabled={pend} onClick={() => { salvar(v); setEditar(false); }} style={sAdd}>Salvar</button>
        </div>
      )}
    </div>
  );
}

/** Riscos de uma fase: lista com status e edição, e cadastro de risco novo. */
export function RiscosFase({ faseId, riscos, equipe, rodar, pend }: { faseId: string; riscos: RiscoVM[]; equipe: { id: string; nome: string }[]; rodar: Rodar; pend: boolean }) {
  const vazio = { nome: '', probabilidade: 2, impacto: 2, responsavelId: '', plano: '' };
  const [n, setN] = useState(vazio);
  const daFase = riscos.filter((r) => r.faseId === faseId);
  return (
    <>
      <span style={s('font-size: 15px; font-weight: 700; margin-top: 6px')}>Riscos da fase</span>
      {daFase.map((r) => <Risco key={r.id} r={r} equipe={equipe} rodar={rodar} pend={pend} />)}
      {daFase.length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nenhum risco nesta fase.</span>}
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; padding: 12px; border-radius: 12px; background: #F7F5F0')}>
        <label style={{ ...sMiniLab, flex: '2 1 180px' }}>Novo risco<input type="text" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} placeholder="O que pode dar errado?" style={sMini} /></label>
        <Escala rotulo="Probabilidade" valor={n.probabilidade} onChange={(v) => setN({ ...n, probabilidade: v })} nomes={ESCALA} />
        <Escala rotulo="Impacto" valor={n.impacto} onChange={(v) => setN({ ...n, impacto: v })} nomes={ESCALA_IMPACTO} />
        <label style={{ ...sMiniLab, flex: '1 1 150px' }}>Responsável
          <select value={n.responsavelId} onChange={(e) => setN({ ...n, responsavelId: e.target.value })} style={sMini}><option value="">—</option>{equipe.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
        </label>
        <label style={{ ...sMiniLab, flex: '3 1 240px' }}>Plano de resposta<input value={n.plano} onChange={(e) => setN({ ...n, plano: e.target.value })} placeholder="O que faremos para evitar ou reduzir" style={sMini} /></label>
        <span style={rkEstilo(nivelDoRisco(n.probabilidade, n.impacto))}>{nivelDoRisco(n.probabilidade, n.impacto)}</span>
        <button type="button" disabled={pend || !n.nome.trim()} onClick={() => { rodar(() => A.adicionarRisco(faseId, { ...n, responsavelId: n.responsavelId || null })); setN(vazio); }} style={sAdd}>Adicionar risco</button>
      </div>
    </>
  );
}
