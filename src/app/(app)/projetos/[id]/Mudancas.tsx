'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { pedirMudanca, decidirMudanca } from '@/app/acoes/mudancas';
import { estiloPill, sBtnPrim, sBtnSec, sInput, sLabel, sToast, sErro } from '@/components/ui';

export type MudancaVM = {
  id: string; tipo: string; tipoRotulo: string; descricao: string; justificativa: string; valores: string; status: string;
  solicitante: string; criadoEm: string; decisao: string;
};

const pill = (bg: string, fg: string) => ({ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: bg, color: fg });
const COR: Record<string, [string, string]> = { pendente: ['#FEF3DC', '#9A5B05'], aprovada: ['#E3F5EA', '#17723D'], recusada: ['#FDE8E8', '#B42318'] };
const ROT: Record<string, string> = { pendente: 'Aguardando o PMO', aprovada: 'Aprovada', recusada: 'Recusada' };

function Pedido({ m, ehPmo }: { m: MudancaVM; ehPmo: boolean }) {
  const [coment, setComent] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const decidir = (aprovar: boolean) => start(async () => { const r = await decidirMudanca(m.id, aprovar, coment); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro }); });
  return (
    <article aria-label={`Mudança de ${m.tipoRotulo.toLowerCase()}: ${m.descricao}`} style={s('border: 1px solid #EFEBE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
        <span style={pill('#EFEAFE', '#4B2FD1')}>{m.tipoRotulo}</span>
        <span style={pill(COR[m.status][0], COR[m.status][1])}>{ROT[m.status]}</span>
      </div>
      <span style={s('font-size: 14px; font-weight: 600')}>{m.descricao}</span>
      {m.valores && <span style={s('font-size: 13px; font-weight: 600; color: #26213A')}>{m.valores}</span>}
      {m.justificativa && <span style={s('font-size: 13px; color: #4A4458; line-height: 1.5')}>Por quê: {m.justificativa}</span>}
      <span style={s('font-size: 12px; color: #5E5770')}>Pedido por {m.solicitante} em {m.criadoEm}{m.decisao ? ` · ${m.decisao}` : ''}</span>
      {m.status === 'pendente' && ehPmo && (
        <div style={s('display: flex; flex-direction: column; gap: 8px')}>
          <label style={sLabel}>Comentário para o GP (obrigatório para recusar)<input value={coment} onChange={(e) => setComent(e.target.value)} style={sInput} /></label>
          <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
            <button type="button" disabled={pend} onClick={() => decidir(false)} style={sBtnSec}>Recusar pedido</button>
            <button type="button" disabled={pend} onClick={() => decidir(true)} style={sBtnPrim}>Aprovar pedido</button>
          </div>
        </div>
      )}
      {msg && <span role="status" style={msg.ok ? s('font-size: 13px; color: #17723D; font-weight: 600') : sErro}>{msg.t}</span>}
    </article>
  );
}

export function Mudancas({ iniciativaId, orcamento, ehPmo, podePedir, pedidos }: { iniciativaId: string; orcamento: string; ehPmo: boolean; podePedir: boolean; pedidos: MudancaVM[] }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState('escopo');
  const [descricao, setDescricao] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [valor, setValor] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const pendentes = pedidos.filter((m) => m.status === 'pendente');
  const historico = pedidos.filter((m) => m.status !== 'pendente');

  return (
    <section id="mudancas" aria-label="Mudanças de escopo e custo" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Mudanças de escopo e custo</h2>
          <span style={s('font-size: 12px; color: #5E5770')}>Aumentar ou reduzir o escopo ou o orçamento passa pela aprovação do PMO. Mudança de prazo é pela linha de base, acima.</span>
        </div>
        <div style={s('background: #F7F5F0; border-radius: 12px; padding: 10px 14px; display: flex; flex-direction: column; gap: 2px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Orçamento aprovado</span><span style={s('font-size: 18px; font-weight: 700')}>{orcamento}</span>
        </div>
      </div>
      {msg?.ok && <span role="status" style={sToast}>{msg.t}</span>}
      {podePedir && !aberto && <div><button type="button" onClick={() => { setAberto(true); setMsg(null); }} style={sBtnSec}>Pedir mudança de escopo ou custo</button></div>}
      {aberto && (
        <div style={s('display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 12px; border: 1px solid #DCD2FF; background: #FBFAFF')}>
          <div style={s('display: flex; gap: 8px')}>
            {([['escopo', 'Escopo'], ['custo', 'Custo']] as const).map(([k, r]) => <button key={k} type="button" aria-pressed={tipo === k} onClick={() => setTipo(k)} style={estiloPill(tipo === k)}>{r}</button>)}
          </div>
          <label style={sLabel}>O que muda<input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === 'custo' ? 'Licenças adicionais para o time de vendas' : 'Incluir integração com o ERP'} style={sInput} /></label>
          {tipo === 'custo' && (
            <label style={sLabel}>Novo orçamento total do projeto (R$)
              <input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 180000" style={sInput} />
            </label>
          )}
          <label style={sLabel}>Por quê<textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} style={{ ...sInput, height: 'auto', padding: '8px 12px', fontWeight: 400 }} /></label>
          {msg && !msg.ok && <span role="alert" style={sErro}>{msg.t}</span>}
          <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
            <button type="button" onClick={() => setAberto(false)} style={sBtnSec}>Cancelar</button>
            <button type="button" disabled={pend} style={sBtnPrim} onClick={() => start(async () => {
              const r = await pedirMudanca(iniciativaId, { tipo, descricao, justificativa, valorNovo: tipo === 'custo' && valor ? Number(valor) : null });
              setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro });
              if (r.ok) { setAberto(false); setDescricao(''); setJustificativa(''); setValor(''); }
            })}>Enviar ao PMO</button>
          </div>
        </div>
      )}
      {pendentes.map((m) => <Pedido key={m.id} m={m} ehPmo={ehPmo} />)}
      {historico.length > 0 && (
        <details>
          <summary style={s('cursor: pointer; font-size: 13px; font-weight: 600; color: #4B2FD1')}>Histórico de mudanças ({historico.length})</summary>
          <div style={s('display: flex; flex-direction: column; gap: 10px; margin-top: 10px')}>{historico.map((m) => <Pedido key={m.id} m={m} ehPmo={ehPmo} />)}</div>
        </details>
      )}
    </section>
  );
}
