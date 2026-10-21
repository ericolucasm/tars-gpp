'use client';

import { useEffect, useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { salvarRaias } from '@/app/acoes/cadastros';

type Raia = { id: string; nome: string; descricao: string; aprovador: string; tipoCard: string; criterios: { texto: string; obrigatorio: boolean }[]; saida: boolean; padrao: boolean; cards: number; novo?: boolean };

const APROVADORES = ['Solicitante', 'Gestor da área solicitante', 'PMO', 'Gerente de projeto', 'Patrocinador'];
const sIn = s('height: 42px; padding: 0 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; color: #26213A');

export function TelaRaias({ raias: iniciais }: { raias: Raia[] }) {
  const [raias, setRaias] = useState(iniciais);
  const [sel, setSel] = useState(iniciais.find((r) => r.padrao && !r.saida && r.tipoCard === 'Projeto')?.id ?? iniciais[0]?.id);
  const [toast, setToast] = useState<{ t: string; ok: boolean } | null>(null);
  const [n, setN] = useState(1);
  const [pend, start] = useTransition();
  useEffect(() => setRaias(iniciais), [iniciais]);

  const fluxo = raias.filter((r) => !r.saida);
  const saida = raias.find((r) => r.saida)!;
  const cur = raias.find((r) => r.id === sel) ?? raias[0];
  const upd = (fn: (r: Raia) => Raia) => { setRaias((rs) => rs.map((r) => (r.id === cur.id ? fn({ ...r, criterios: r.criterios.slice() }) : r))); setToast(null); };
  const mover = (id: string, d: number) => {
    const f = fluxo.slice(); const i = f.findIndex((r) => r.id === id), j = i + d;
    if (j < 0 || j >= f.length) return;
    [f[i], f[j]] = [f[j], f[i]];
    setRaias([...f, saida]); setToast(null);
  };

  return (
    <>
      <div style={s('display: flex; flex-direction: column; gap: 4px')}>
        <span style={s('font-size: 12px; color: #5E5770')}>Configuração / Configurações</span>
        <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Configurações</h1>
        <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Ajuste o TARS ao jeito da sua empresa. Tudo já vem pronto com as boas práticas de PMO.</p>
      </div>
      <div style={s('display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #E2DCD0; padding-bottom: 8px')}>
        <span aria-current="page" style={s('height: 38px; padding: 0 14px; border-radius: 10px; font-size: 13px; font-weight: 700; background: #E7E0FF; color: #3A22A8; display: inline-flex; align-items: center')}>Raias do portfólio</span>
        {['Empresa', 'Modo de captação', 'Notificações', 'Plano e cobrança'].map((x) => <span key={x} title="Em breve" style={s('height: 38px; padding: 0 14px; font-size: 13px; color: #ABA4B7; display: inline-flex; align-items: center')}>{x}</span>)}
      </div>

      <div style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px')}>
        <span style={s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px')}>FLUXO ATUAL</span>
        <div style={s('display: flex; flex-wrap: wrap; gap: 6px; align-items: center')}>
          {fluxo.map((l, i) => (
            <span key={l.id} style={s('display: contents')}>
              <span style={{ ...s('font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 10px'), background: l.tipoCard === 'Projeto' ? '#E7E0FF' : '#EDEAE3', color: l.tipoCard === 'Projeto' ? '#3A22A8' : '#4A4458' }}>{l.nome || 'Sem nome'}</span>
              {i < fluxo.length - 1 && <span style={s('font-size: 12px; color: #8A8296')}>→</span>}
            </span>
          ))}
          <span style={s('font-size: 12px; color: #5E5770; margin-left: 6px')}>· saída a qualquer momento: <strong>{saida?.nome}</strong></span>
        </div>
      </div>

      {toast && <div role="status" style={{ ...s('padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600'), background: toast.ok ? '#EFEAFE' : '#FEF3DC', color: toast.ok ? '#3A22A8' : '#6B3F03' }}>{toast.t}</div>}

      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <section aria-label="Raias" style={s('flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 8px')}>
          {raias.map((l) => {
            const on = l.id === cur.id;
            const pos = l.saida ? '×' : fluxo.indexOf(l) + 1;
            return (
              <div key={l.id} style={{ ...s('display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: #FFFFFF'), border: on ? '2px solid #6D4AFF' : `1px ${l.saida ? 'dashed' : 'solid'} #E2DCD0` }}>
                <span style={s('width: 26px; height: 26px; border-radius: 8px; background: #EFEAFE; color: #4B2FD1; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center')}>{pos}</span>
                <button type="button" aria-pressed={on} onClick={() => { setSel(l.id); setToast(null); }} style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; border: 0; background: transparent; text-align: left; padding: 0; color: #26213A')}>
                  <span style={s('font-size: 14px; font-weight: 600')}>{l.nome || 'Sem nome'}</span>
                  <span style={s('font-size: 12px; color: #5E5770')}>{l.criterios.length} {l.criterios.length === 1 ? 'critério' : 'critérios'} · aprova: {l.aprovador}</span>
                </button>
                {!l.saida ? (
                  <>
                    <button type="button" aria-label={`Subir ${l.nome}`} onClick={() => mover(l.id, -1)} style={s('width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #4A4458')}>↑</button>
                    <button type="button" aria-label={`Descer ${l.nome}`} onClick={() => mover(l.id, 1)} style={s('width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #4A4458')}>↓</button>
                  </>
                ) : <span style={s('font-size: 11px; color: #5E5770')}>fixa</span>}
              </div>
            );
          })}
          <button type="button" onClick={() => { const id = `nova-${n}`; setRaias([...fluxo, { id, novo: true, nome: 'Nova raia', descricao: '', aprovador: 'PMO', tipoCard: 'Projeto', criterios: [], saida: false, padrao: false, cards: 0 }, saida]); setSel(id); setN(n + 1); setToast(null); }}
            style={s('height: 44px; border-radius: 12px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 13px; font-weight: 600')}>+ Nova raia</button>
          <span style={s('font-size: 12px; color: #5E5770; line-height: 1.5')}>Use as setas para reordenar. A raia de saída fica sempre disponível em qualquer etapa.</span>
        </section>

        {cur && (
          <section aria-label="Editar raia" style={s('flex: 999 1 480px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 16px')}>
            <div style={s('display: flex; justify-content: space-between; gap: 8px; align-items: center; flex-wrap: wrap')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Editar raia</h2><span style={s('font-size: 12px; color: #5E5770')}>{cur.cards > 0 ? `${cur.cards} card(s) nesta raia hoje · não pode ser excluída` : cur.padrao ? 'Raia padrão do TARS' : 'Raia vazia'}</span></div>
            <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px')}>
              <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Nome da raia<input value={cur.nome} onChange={(e) => upd((r) => ({ ...r, nome: e.target.value }))} style={sIn} /></label>
              <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Descrição curta<input value={cur.descricao} onChange={(e) => upd((r) => ({ ...r, descricao: e.target.value }))} style={sIn} /></label>
            </div>
            <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px')}>
              <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Quem aprova a entrada nesta raia
                <select value={cur.aprovador} onChange={(e) => upd((r) => ({ ...r, aprovador: e.target.value }))} style={{ ...sIn, background: '#FFFFFF', padding: '0 10px' }}>{APROVADORES.map((a) => <option key={a}>{a}</option>)}</select>
              </label>
              <div style={s('display: flex; flex-direction: column; gap: 6px')}><span style={s('font-size: 13px; font-weight: 600')}>O card aparece como</span>
                <div style={s('display: flex; gap: 8px')}>
                  {['Iniciativa', 'Projeto'].map((k) => { const on = cur.tipoCard === k; return <button key={k} type="button" aria-pressed={on} onClick={() => upd((r) => ({ ...r, tipoCard: k }))} style={{ ...s('height: 42px; padding: 0 16px; border-radius: 10px; font-size: 13px'), fontWeight: on ? 700 : 500, border: `1px solid ${on ? '#6D4AFF' : '#E2DCD0'}`, background: on ? '#EFEAFE' : '#FFFFFF', color: on ? '#3A22A8' : '#26213A' }}>{k}</button>; })}
                </div>
              </div>
            </div>
            <div style={s('display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #EFEBE3; padding-top: 14px')}>
              <div style={s('display: flex; flex-direction: column; gap: 2px')}><span style={s('font-size: 15px; font-weight: 700')}>Critérios de passagem</span><span style={s('font-size: 12px; color: #5E5770')}>O que precisa estar pronto para um card entrar em “{cur.nome}”.</span></div>
              {cur.criterios.map((c, i) => (
                <div key={i} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px; border-radius: 10px; border: 1px solid #EFEBE3')}>
                  <input value={c.texto} aria-label={`Critério ${i + 1}`} onChange={(e) => upd((r) => { r.criterios[i] = { ...r.criterios[i], texto: e.target.value }; return r; })} style={s('flex: 1 1 240px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A')} />
                  <label style={s('display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4A4458')}><input type="checkbox" checked={c.obrigatorio} onChange={() => upd((r) => { r.criterios[i] = { ...r.criterios[i], obrigatorio: !r.criterios[i].obrigatorio }; return r; })} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />Obrigatório</label>
                  <button type="button" aria-label={`Remover critério ${i + 1}`} onClick={() => upd((r) => { r.criterios.splice(i, 1); return r; })} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
                </div>
              ))}
              {cur.criterios.length === 0 && <span style={s('font-size: 13px; color: #5E5770; padding: 10px; border: 1px dashed #D6CFC2; border-radius: 10px; text-align: center')}>Sem critérios: o card entra direto, sem confirmação.</span>}
              <button type="button" onClick={() => upd((r) => { r.criterios.push({ texto: 'Novo critério', obrigatorio: true }); return r; })} style={s('align-self: flex-start; height: 38px; padding: 0 14px; border-radius: 10px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 13px; font-weight: 600')}>+ Adicionar critério</button>
            </div>
            <div style={s('background: #F7F5F0; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 6px')}>
              <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1; letter-spacing: 0.3px')}>PRÉVIA</span>
              <span style={s('font-size: 13px')}>Ao mover um card para <strong>{cur.nome}</strong>, {cur.aprovador} confirma:</span>
              {cur.criterios.map((c, i) => <span key={i} style={s('font-size: 13px; color: #4A4458')}>☐ {c.texto}{c.obrigatorio ? '' : ' (opcional)'}</span>)}
            </div>
            <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center')}>
              <span style={s('font-size: 12px; color: #5E5770; max-width: 420px; line-height: 1.5')}>Mudanças valem para os próximos movimentos. O histórico guarda os critérios que valiam em cada passagem.</span>
              <div style={s('display: flex; gap: 8px')}>
                {!cur.saida && !cur.padrao && cur.cards === 0 && (
                  <button type="button" onClick={() => { const rest = raias.filter((r) => r.id !== cur.id); setRaias(rest); setSel(rest[0].id); setToast({ t: 'Raia excluída. Clique em Salvar alterações para confirmar.', ok: true }); }} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #F5D2D2; background: #FFFFFF; color: #B42318; font-size: 13px')}>Excluir raia</button>
                )}
                <button type="button" disabled={pend} onClick={() => start(async () => { const r = await salvarRaias(fluxo, saida); setToast({ t: r.ok ? r.msg ?? 'Salvo.' : r.erro, ok: r.ok }); })} style={s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Salvar alterações</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
