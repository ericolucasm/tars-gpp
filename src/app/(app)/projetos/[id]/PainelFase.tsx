'use client';

import { useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { br } from '@/lib/regras/datas';
import { salvarPainelFase } from '@/app/acoes/projeto';

type Pessoa = { id: string; nome: string; ini: string; papel: string; cap: number | null; noProjeto: boolean };
type Marco = { id: string; faseId: string; nome: string; data: string | null; status: string };

const sLab = s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px');
const sSel = s('height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');
const sMini = s('width: 28px; height: 28px; border-radius: 7px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 14px; padding: 0');

/**
 * Linha expandida da linha do tempo: quem atua na fase e com quanto, quem confirma o fim dela (gate) e os marcos.
 * Tudo fica em rascunho até o OK, que salva de uma vez e fecha o painel.
 */
export function PainelFase({ fase, datas, criterio, pessoas, alocs, marcos, responsavelId, gpNome, aoFechar }: {
  fase: { id: string; nome: string }; datas: string; criterio: string; pessoas: Pessoa[];
  alocs: { pessoaId: string; pct: number }[]; marcos: Marco[]; responsavelId: string | null; gpNome: string; aoFechar: (msg?: string) => void;
}) {
  const [equipe, setEquipe] = useState(alocs);
  const [resp, setResp] = useState(responsavelId ?? '');
  const [novos, setNovos] = useState<{ nome: string; data: string }[]>([]);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [marco, setMarco] = useState({ nome: '', data: '' });
  const [quem, setQuem] = useState('');
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const pessoa = (id: string) => pessoas.find((x) => x.id === id);
  const livres = pessoas.filter((x) => !equipe.some((a) => a.pessoaId === x.id)).sort((a, b) => Number(b.noProjeto) - Number(a.noProjeto) || a.nome.localeCompare(b.nome));
  const mudar = (pessoaId: string, d: number) => setEquipe((e) => e.map((a) => (a.pessoaId === pessoaId ? { ...a, pct: Math.max(10, Math.min(100, a.pct + d)) } : a)));

  function ok() {
    start(async () => {
      const r = await salvarPainelFase(fase.id, { alocacoes: equipe, responsavelId: resp || null, marcosNovos: novos, marcosRemovidos: removidos });
      if (!r.ok) setErro(r.erro); else aoFechar(r.msg);
    });
  }

  return (
    <div role="region" aria-label={`Painel da fase ${fase.nome}`}
      style={s('margin: 4px 8px 10px; padding: 16px; border-radius: 12px; border: 2px solid #6D4AFF; background: #FFFFFF; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 6px 18px rgba(38, 33, 58, 0.08)')}>
      <div style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between')}>
        <span style={s('font-size: 15px; font-weight: 700')}>{fase.nome} <span style={s('font-size: 12px; font-weight: 500; color: #5E5770')}>· {datas}</span></span>
        <span style={s('font-size: 12px; color: #8A8296')}>Para mudar as datas, arraste a barra.</span>
      </div>

      <div style={s('display: flex; flex-direction: column; gap: 8px')}>
        <span style={sLab}>QUEM ATUA NESTA FASE</span>
        {equipe.map((a) => {
          const x = pessoa(a.pessoaId);
          const acima = x?.cap != null && a.pct > x.cap;
          return (
            <div key={a.pessoaId} role="group" aria-label={`Alocação de ${x?.nome ?? ''}`} style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px')}>
              <span style={s('width: 28px; height: 28px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex: 0 0 28px')}>{x?.ini}</span>
              <span style={s('flex: 1 1 180px; display: flex; flex-direction: column')}><strong>{x?.nome}</strong><span style={s('font-size: 11px; color: #5E5770')}>{x?.papel}</span></span>
              <button type="button" aria-label={`Diminuir ${x?.nome}`} onClick={() => mudar(a.pessoaId, -10)} style={sMini}>−</button>
              <span style={s('min-width: 40px; text-align: center; font-weight: 700')}>{a.pct}%</span>
              <button type="button" aria-label={`Aumentar ${x?.nome}`} onClick={() => mudar(a.pessoaId, 10)} style={sMini}>+</button>
              <span style={{ fontSize: 12, color: acima ? '#9A5B05' : '#5E5770', fontWeight: acima ? 600 : 400, flex: '0 1 280px' }}>
                {x?.cap == null ? 'sem limite de cedência' : acima ? `cede até ${x.cap}% · vai pedir aprovação ao gestor` : `cede até ${x.cap}%`}
              </span>
              <button type="button" aria-label={`Tirar ${x?.nome} da fase`} onClick={() => setEquipe((e) => e.filter((y) => y.pessoaId !== a.pessoaId))} style={s('border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
            </div>
          );
        })}
        {equipe.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Ninguém atribuído ainda.</span>}
        <div style={s('display: flex; gap: 8px; align-items: center; flex-wrap: wrap')}>
          <select aria-label="Atribuir pessoa" value={quem} onChange={(e) => setQuem(e.target.value)} style={sSel}>
            <option value="">Escolha a pessoa…</option>
            {livres.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.noProjeto ? '' : ' (fora do projeto)'}</option>)}
          </select>
          <button type="button" disabled={!quem} onClick={() => { setEquipe((e) => [...e, { pessoaId: quem, pct: 20 }]); setQuem(''); }}
            style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 13px; font-weight: 600')}>+ Atribuir (20%)</button>
        </div>
      </div>

      <div style={s('display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid #EFEBE3')}>
        <span style={sLab}>DA FASE</span>
        <label style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 13px')}>Responsável pelo fim da fase (gate)
          <select aria-label="Responsável pelo fim da fase" value={resp} onChange={(e) => setResp(e.target.value)} style={sSel}>
            <option value="">{gpNome ? `${gpNome} (GP do projeto)` : 'GP do projeto'}</option>
            {pessoas.filter((x) => x.cap !== null || x.noProjeto).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
        <span style={s('font-size: 13px; color: #4A4458')}><strong>Critério de conclusão:</strong> {criterio || 'entregas da fase concluídas'}</span>
        <span style={s('font-size: 13px; font-weight: 600')}>Marcos</span>
        {[...marcos.filter((m) => !removidos.includes(m.id)), ...novos.map((n, i) => ({ id: `novo${i}`, nome: n.nome, data: n.data || null, status: 'novo' }))].map((m) => (
          <span key={m.id} style={s('display: flex; gap: 8px; align-items: center; font-size: 13px')}>
            ◆ {m.nome}{m.data ? ` · ${br(m.data).slice(0, 5)}` : ''}{m.status === 'novo' ? ' (novo)' : ''}
            <button type="button" aria-label={`Remover marco ${m.nome}`} onClick={() => (m.id.startsWith('novo') ? setNovos((x) => x.filter((_, i) => `novo${i}` !== m.id)) : setRemovidos((x) => [...x, m.id]))} style={s('border: 0; background: transparent; color: #8A8296; font-size: 14px')}>×</button>
          </span>
        ))}
        <div style={s('display: flex; gap: 8px; flex-wrap: wrap; align-items: center')}>
          <input aria-label="Nome do marco" value={marco.nome} onChange={(e) => setMarco({ ...marco, nome: e.target.value })} placeholder="Novo marco (entrega-chave)" style={{ ...sSel, flex: '1 1 200px' }} />
          <input type="date" aria-label="Data do marco" value={marco.data} onChange={(e) => setMarco({ ...marco, data: e.target.value })} style={sSel} />
          <button type="button" disabled={!marco.nome.trim()} onClick={() => { setNovos((x) => [...x, marco]); setMarco({ nome: '', data: '' }); }}
            style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 13px; font-weight: 600')}>+ Marco</button>
        </div>
      </div>

      {erro && <span role="alert" style={s('font-size: 13px; color: #B42318')}>{erro}</span>}
      <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
        <button type="button" onClick={() => aoFechar()} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Cancelar</button>
        <button type="button" disabled={pend} onClick={ok} style={s('height: 38px; padding: 0 18px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>OK</button>
      </div>
    </div>
  );
}
