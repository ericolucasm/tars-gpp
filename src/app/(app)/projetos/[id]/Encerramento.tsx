'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import type { ItemBalanco } from '@/lib/regras/encerramento';
import { registrarLicao, removerLicao } from '@/app/acoes/licoes';
import { ConcluirProjeto, type ConclusaoVM } from './ConcluirProjeto';
import { estiloPill, sBtnPrim, sInput, sLabel, sErro } from '@/components/ui';

type LicaoVM = { id: string; tipo: string; texto: string; autor: string; data: string; projeto?: string; podeRemover?: boolean };
const COR = { ok: ['#E3F5EA', '#17723D'], aten: ['#FEF3DC', '#9A5B05'], crit: ['#FDE8E8', '#B42318'], neutro: ['#EDEAE3', '#4A4458'] };

export function Encerramento({ iniciativaId, concluido, balanco, licoes, parecidas, conclusao }: { iniciativaId: string; concluido: boolean; balanco: ItemBalanco[]; licoes: LicaoVM[]; parecidas: LicaoVM[]; conclusao?: ConclusaoVM | null }) {
  const [tipo, setTipo] = useState('funcionou');
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, start] = useTransition();
  const [concluiu, setConcluiu] = useState(false);
  const lista = (titulo: string, ls: LicaoVM[], comProjeto?: boolean) => (
    <div style={s('display: flex; flex-direction: column; gap: 6px')}>
      <span style={s('font-size: 13px; font-weight: 700')}>{titulo}</span>
      {ls.map((l) => (
        <div key={l.id} style={s('display: flex; gap: 8px; align-items: flex-start; font-size: 13px; padding: 8px 10px; border: 1px solid #EFEBE3; border-radius: 10px')}>
          <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; flex: 0 0 auto'), background: l.tipo === 'funcionou' ? '#E3F5EA' : '#FEF3DC', color: l.tipo === 'funcionou' ? '#17723D' : '#9A5B05' }}>{l.tipo === 'funcionou' ? 'Funcionou' : 'Melhorar'}</span>
          <span style={s('flex: 1')}>{l.texto} <span style={s('color: #8A8296; font-size: 12px')}>· {comProjeto ? `${l.projeto} · ` : ''}{l.autor}, {l.data}</span></span>
          {l.podeRemover && <button type="button" aria-label="Remover lição" onClick={() => start(async () => { await removerLicao(l.id); })} style={s('border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>}
        </div>
      ))}
    </div>
  );
  return (
    <section id="encerramento" aria-label="Encerramento e lições aprendidas" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 16px')}>
      <div style={s('display: flex; flex-direction: column; gap: 2px')}>
        <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{concluido ? 'Encerramento e lições aprendidas' : 'Balanço e lições aprendidas'}</h2>
        <span style={s('font-size: 12px; color: #5E5770')}>{concluido ? 'Balanço final do projeto: o planejado × o que aconteceu.' : 'Como o projeto está até agora em relação ao planejado. No encerramento, este vira o balanço final.'} Registre lições a qualquer momento: elas aparecem para projetos parecidos.</span>
      </div>
      {concluiu
        ? <span role="status" style={s('font-size: 13px; font-weight: 600; color: #17723D')}>Projeto concluído. O PMO e quem pediu foram avisados.</span>
        : conclusao && <ConcluirProjeto iniciativaId={iniciativaId} c={conclusao} aoConcluir={() => setConcluiu(true)} />}
      <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
        <table style={s('width: 100%; border-collapse: collapse; font-size: 13px; min-width: 620px')}>
          <thead><tr>{['', 'Planejado', 'Realizado', 'Leitura'].map((c) => <th key={c} scope="col" style={s('text-align: left; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #5E5770; background: #FAF8F4; border-bottom: 1px solid #EFEBE3')}>{c}</th>)}</tr></thead>
          <tbody>
            {balanco.map((b) => (
              <tr key={b.dimensao}>
                <th scope="row" style={s('text-align: left; padding: 9px 12px; border-bottom: 1px solid #F3F0EA')}>{b.dimensao}</th>
                <td style={s('padding: 9px 12px; color: #4A4458; border-bottom: 1px solid #F3F0EA')}>{b.planejado}</td>
                <td style={s('padding: 9px 12px; color: #4A4458; border-bottom: 1px solid #F3F0EA')}>{b.realizado}</td>
                <td style={s('padding: 9px 12px; border-bottom: 1px solid #F3F0EA')}><span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: COR[b.tom][0], color: COR[b.tom][1] }}>{b.leitura}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={s('display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: #F7F5F0')}>
        <div style={s('display: flex; gap: 8px')}>
          {([['funcionou', 'O que funcionou'], ['melhorar', 'O que melhorar']] as const).map(([k, r]) => <button key={k} type="button" aria-pressed={tipo === k} onClick={() => setTipo(k)} style={estiloPill(tipo === k)}>{r}</button>)}
        </div>
        <label style={sLabel}>Lição aprendida<input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: validar a base de dados com a área antes de começar o desenvolvimento" style={sInput} /></label>
        {msg && !msg.ok && <span role="alert" style={sErro}>{msg.t}</span>}
        <div><button type="button" disabled={pend} onClick={() => start(async () => { const r = await registrarLicao(iniciativaId, { tipo, texto }); setMsg({ ok: r.ok, t: r.ok ? r.msg ?? '' : r.erro }); if (r.ok) setTexto(''); })} style={sBtnPrim}>Registrar lição</button></div>
      </div>
      {licoes.length > 0 && lista('Lições deste projeto', licoes)}
      {parecidas.length > 0 && lista('Lições de projetos parecidos (mesmo modelo)', parecidas, true)}
    </section>
  );
}
