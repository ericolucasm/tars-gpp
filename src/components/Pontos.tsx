'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import type { PontoVM } from '@/lib/pontos-vm';
import { abrirPonto, resolverPonto } from '@/app/acoes/pontos';
import { estiloPill, sBtnPrim, sBtnSec, sInput, sLabel, sToast, sErro } from '@/components/ui';

const pill = (bg: string, fg: string) => ({ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; white-space: nowrap'), background: bg, color: fg });

/** Cartão de um ponto de atenção, com a resolução inline para quem pode decidir. */
export function CartaoPonto({ p, comProjeto }: { p: PontoVM; comProjeto?: boolean }) {
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const aberto = p.status === 'aberto';
  return (
    <article aria-label={p.titulo} style={{ ...s('border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px'), border: `1px solid ${p.atrasado ? '#F5D2D2' : '#EFEBE3'}`, background: p.atrasado ? '#FFFAFA' : '#FFFFFF' }}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 6px; align-items: center')}>
        <span style={p.tipo === 'impedimento' ? pill('#FDE8E8', '#B42318') : pill('#EFEAFE', '#4B2FD1')}>{p.tipoRotulo}</span>
        {aberto ? <span style={pill('#EDEAE3', '#4A4458')}>Para: {p.destino}</span> : <span style={pill('#E3F5EA', '#17723D')}>Resolvido</span>}
        {aberto && p.prazo && <span style={p.atrasado ? pill('#FDE8E8', '#B42318') : pill('#EDEAE3', '#4A4458')}>{p.atrasado ? `Atrasado · prazo ${p.prazo}` : `Responder até ${p.prazo}`}</span>}
      </div>
      <span style={s('font-size: 15px; font-weight: 600')}>{p.titulo}</span>
      <span style={s('font-size: 12px; color: #5E5770')}>
        {comProjeto && <><Link href={`/projetos/${p.projetoId}#pontos`} style={s('font-weight: 600')}>{p.projeto}</Link> · </>}
        {p.fase ? `Fase ${p.fase} · ` : ''}aberto por {p.abertoPor} em {p.abertoEm}
      </span>
      {p.descricao && <span style={s('font-size: 13px; color: #4A4458; line-height: 1.5; white-space: pre-wrap')}>{p.descricao}</span>}
      {!aberto && <span style={s('font-size: 13px; color: #17723D; line-height: 1.5')}><strong>Resolução:</strong> {p.resolucao} <span style={s('color: #5E5770')}>({p.resolvidoPor}, {p.resolvidoEm})</span></span>}
      {aberto && p.podeResolver && (
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          <label style={sLabel}>O que foi decidido ou feito?
            <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} style={{ ...sInput, height: 'auto', padding: '8px 12px', fontWeight: 400 }} />
          </label>
          <div style={s('display: flex; justify-content: flex-end')}>
            <button type="button" disabled={pend} onClick={() => start(async () => { const r = await resolverPonto(p.id, texto); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro }); })} style={sBtnPrim}>Registrar resolução</button>
          </div>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D') : sErro}>{msg.t}</span>}
    </article>
  );
}

/** Formulário para abrir um ponto de atenção no projeto. */
export function NovoPonto({ iniciativaId, fases, gestores }: { iniciativaId: string; fases: { id: string; nome: string }[]; gestores: { id: string; nome: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState('impedimento');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [destino, setDestino] = useState('pmo');
  const [gestor, setGestor] = useState('');
  const [prazo, setPrazo] = useState('');
  const [fase, setFase] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();

  if (!aberto) return (
    <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center')}>
      <button type="button" onClick={() => { setAberto(true); setMsg(null); }} style={sBtnPrim}>Abrir ponto de atenção</button>
      {msg?.ok && <span role="status" style={sToast}>{msg.t}</span>}
    </div>
  );
  return (
    <div style={s('display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px; border: 1px solid #DCD2FF; background: #FBFAFF')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
        {([['impedimento', 'Impedimento'], ['decisao', 'Decisão necessária']] as const).map(([k, r]) => <button key={k} type="button" aria-pressed={tipo === k} onClick={() => setTipo(k)} style={estiloPill(tipo === k)}>{r}</button>)}
      </div>
      <label style={sLabel}>Em poucas palavras<input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Fornecedor não liberou o ambiente de testes" style={sInput} /></label>
      <label style={sLabel}>Detalhes e o que você precisa<textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ ...sInput, height: 'auto', padding: '8px 12px', fontWeight: 400 }} /></label>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px')}>
        <label style={sLabel}>Quem precisa resolver
          <select value={destino} onChange={(e) => setDestino(e.target.value)} style={sInput}><option value="pmo">PMO</option><option value="gestor">Um gestor de área</option></select>
        </label>
        {destino === 'gestor' && (
          <label style={sLabel}>Gestor
            <select value={gestor} onChange={(e) => setGestor(e.target.value)} style={sInput}><option value="">Escolha…</option>{gestores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
          </label>
        )}
        <label style={sLabel}>Precisa da resposta até<input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} style={sInput} /></label>
        <label style={sLabel}>Fase (opcional)
          <select value={fase} onChange={(e) => setFase(e.target.value)} style={sInput}><option value="">Projeto todo</option>{fases.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
        </label>
      </div>
      {msg && !msg.ok && <span role="alert" style={sErro}>{msg.t}</span>}
      <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
        <button type="button" onClick={() => setAberto(false)} style={sBtnSec}>Cancelar</button>
        <button type="button" disabled={pend} style={sBtnPrim} onClick={() => start(async () => {
          const r = await abrirPonto(iniciativaId, { tipo, titulo, descricao, destino, destinatarioId: gestor || null, prazo: prazo || null, faseId: fase || null });
          setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro });
          if (r.ok) { setAberto(false); setTitulo(''); setDescricao(''); setPrazo(''); setFase(''); setGestor(''); setDestino('pmo'); }
        })}>Enviar</button>
      </div>
    </div>
  );
}
