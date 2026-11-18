'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { alternarTarefa, confirmarFimFase } from '@/app/acoes/projeto';
import { informarRisco, pedirPrazo } from '@/app/acoes/muro';
import { abrirPonto } from '@/app/acoes/pontos';
import { estiloPill, sBtnPrim, sBtnSec, sInput, sLabel, sErro } from '@/components/ui';

export type EntregaVM = {
  tipo: 'tarefa' | 'fase' | 'status' | 'decisao'; id: string; iniciativaId: string; projeto: string; titulo: string; tipoRotulo: string;
  vence: string; atrasada: boolean; emNegociacao: boolean; faseId: string | null; linkStatus: string | null; link?: string | null;
};
type Acao = '' | 'prazo' | 'impedimento' | 'risco';

/** Uma entrega com data e as ações de quem é responsável por ela. */
export function CartaoEntrega({ e }: { e: EntregaVM }) {
  const [acao, setAcao] = useState<Acao>('');
  const [f, setF] = useState({ novoPrazo: '', motivo: '', titulo: '', descricao: '', nome: '', probabilidade: 2, impacto: 2, plano: '' });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, ok = 'Feito.') =>
    start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? ok : r.erro ?? '' }); if (r.ok) setAcao(''); });
  const borda = e.atrasada && !e.emNegociacao ? '#F5D2D2' : '#EFEBE3';
  return (
    <article aria-label={`${e.tipoRotulo}: ${e.titulo}`} style={{ ...s('border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px'), border: `1px solid ${borda}`, background: e.atrasada && !e.emNegociacao ? '#FFFAFA' : '#FFFFFF' }}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 6px; align-items: center')}>
        <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EFEAFE; color: #4B2FD1')}>{e.tipoRotulo}</span>
        <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: e.emNegociacao ? '#FEF3DC' : e.atrasada ? '#FDE8E8' : '#EDEAE3', color: e.emNegociacao ? '#9A5B05' : e.atrasada ? '#B42318' : '#4A4458' }}>
          {e.emNegociacao ? `Prazo em negociação · ${e.vence}` : e.vence}
        </span>
      </div>
      <span style={s('font-size: 15px; font-weight: 600')}>{e.titulo}</span>
      <span style={s('font-size: 12px; color: #5E5770')}>{e.projeto}</span>
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
        {e.tipo === 'tarefa' && <button type="button" disabled={pend} onClick={() => rodar(() => alternarTarefa(e.id), 'Tarefa concluída.')} style={sBtnPrim}>Concluir tarefa</button>}
        {e.tipo === 'fase' && <button type="button" disabled={pend} onClick={() => rodar(() => confirmarFimFase(e.id), 'Fim da fase confirmado.')} style={sBtnPrim}>Confirmar fim da fase</button>}
        {e.tipo === 'status' && e.linkStatus && <Link href={e.linkStatus} style={{ ...sBtnPrim, display: 'inline-flex', alignItems: 'center' }}>Publicar status</Link>}
        {e.tipo === 'decisao' && e.link && <Link href={e.link} style={{ ...sBtnPrim, display: 'inline-flex', alignItems: 'center' }}>Decidir</Link>}
        {(e.tipo === 'tarefa' || e.tipo === 'fase') && !e.emNegociacao && <button type="button" onClick={() => setAcao(acao === 'prazo' ? '' : 'prazo')} style={sBtnSec}>Pedir mais prazo</button>}
        {(e.tipo === 'tarefa' || e.tipo === 'fase') && <button type="button" onClick={() => setAcao(acao === 'impedimento' ? '' : 'impedimento')} style={sBtnSec}>Informar impedimento</button>}
        {e.faseId && <button type="button" onClick={() => setAcao(acao === 'risco' ? '' : 'risco')} style={sBtnSec}>Informar risco</button>}
      </div>
      {acao === 'prazo' && (
        <div style={s('display: grid; grid-template-columns: 170px 1fr auto; gap: 8px; align-items: end; padding: 10px; border-radius: 10px; background: #F7F5F0')}>
          <label style={sLabel}>Novo prazo<input type="date" value={f.novoPrazo} onChange={(x) => setF({ ...f, novoPrazo: x.target.value })} style={sInput} /></label>
          <label style={sLabel}>Por quê<input value={f.motivo} onChange={(x) => setF({ ...f, motivo: x.target.value })} style={sInput} /></label>
          <button type="button" disabled={pend} onClick={() => rodar(() => pedirPrazo(e.tipo as 'tarefa' | 'fase', e.id, { novoPrazo: f.novoPrazo, motivo: f.motivo }))} style={sBtnPrim}>Enviar ao GP</button>
        </div>
      )}
      {acao === 'impedimento' && (
        <div style={s('display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; background: #F7F5F0')}>
          <label style={sLabel}>O que está impedindo<input value={f.titulo} onChange={(x) => setF({ ...f, titulo: x.target.value })} style={sInput} /></label>
          <label style={sLabel}>Do que você precisa<input value={f.descricao} onChange={(x) => setF({ ...f, descricao: x.target.value })} style={sInput} /></label>
          <div><button type="button" disabled={pend} onClick={() => rodar(() => abrirPonto(e.iniciativaId, { tipo: 'impedimento', titulo: f.titulo, descricao: `${e.titulo}: ${f.descricao}`, destino: 'gp', destinatarioId: null, prazo: null, faseId: e.faseId }))} style={sBtnPrim}>Enviar ao GP</button></div>
        </div>
      )}
      {acao === 'risco' && e.faseId && (
        <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; align-items: end; padding: 10px; border-radius: 10px; background: #F7F5F0')}>
          <label style={sLabel}>Risco<input value={f.nome} onChange={(x) => setF({ ...f, nome: x.target.value })} style={sInput} /></label>
          <div role="group" aria-label="Probabilidade" style={s('display: flex; gap: 4px; flex-wrap: wrap')}>{[1, 2, 3].map((n) => <button key={n} type="button" aria-pressed={f.probabilidade === n} onClick={() => setF({ ...f, probabilidade: n })} style={estiloPill(f.probabilidade === n)}>{['', 'Prob. baixa', 'Prob. média', 'Prob. alta'][n]}</button>)}</div>
          <div role="group" aria-label="Impacto" style={s('display: flex; gap: 4px; flex-wrap: wrap')}>{[1, 2, 3].map((n) => <button key={n} type="button" aria-pressed={f.impacto === n} onClick={() => setF({ ...f, impacto: n })} style={estiloPill(f.impacto === n)}>{['', 'Impacto baixo', 'Impacto médio', 'Impacto alto'][n]}</button>)}</div>
          <label style={sLabel}>O que fazer (opcional)<input value={f.plano} onChange={(x) => setF({ ...f, plano: x.target.value })} style={sInput} /></label>
          <button type="button" disabled={pend} onClick={() => rodar(() => informarRisco(e.faseId!, { nome: f.nome, probabilidade: f.probabilidade, impacto: f.impacto, plano: f.plano }))} style={sBtnPrim}>Informar ao GP</button>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </article>
  );
}
