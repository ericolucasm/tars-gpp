'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { notaFinal, ordenarPorNota, podeComunicar } from '@/lib/regras/avaliacao';
import { comunicarDecisoes, darNota, decidir, definirMotivoRecusa } from '@/app/acoes/avaliacao';

type Dec = 'pre' | 'bkl' | 'rec' | null;
type Linha = { id: string; titulo: string; area: string; tipo: string; custo: number; custoLabel: string; obrigatoria: boolean; notas: number[]; decisao: Dec; motivoRecusa: string | null; comunicado: boolean };
type Props = {
  cicloNome: string | null; orcamento: number; pesos: { nome: string; peso: number }[]; podeAjustarPesos: boolean;
  alerta: { titulo: string; area: string; pessoa: string; projeto: string } | null; motivos: string[]; linhas: Linha[];
};

const CRIT = ['Impacto', 'Urgência', 'Alinhamento', 'Facilidade'];
const money = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
const GRADE = 'display: grid; grid-template-columns: 2.6fr repeat(4, 1.15fr) 0.7fr 2fr; gap: 10px';

export function TelaAvaliacao(p: Props) {
  const [linhas, setLinhas] = useState(p.linhas);
  const [toast, setToast] = useState<{ texto: string; ok: boolean } | null>(null);
  const [pend, start] = useTransition();
  useEffect(() => setLinhas(p.linhas), [p.linhas]);
  const pesos = p.pesos.map((x) => x.peso);

  // atualização otimista: a tela muda na hora e o servidor confirma em seguida
  const mudar = (id: string, fn: (l: Linha) => Linha, acao: () => Promise<{ ok: boolean; erro?: string }>) => {
    setLinhas((ls) => ls.map((l) => (l.id === id ? fn(l) : l)));
    setToast(null);
    start(async () => { const r = await acao(); if (!r.ok) setToast({ texto: r.erro ?? 'Erro', ok: false }); });
  };

  const ordenadas = useMemo(() => ordenarPorNota(linhas, (l) => notaFinal(l.notas, pesos)), [linhas, pesos]);
  const pre = linhas.filter((l) => l.decisao === 'pre');
  const total = pre.reduce((t, l) => t + l.custo, 0);
  const pct = p.orcamento ? Math.round((total / p.orcamento) * 100) : 0;
  const passou = total > p.orcamento;

  function comunicar() {
    const abertas = linhas.filter((l) => !l.comunicado);
    const chk = podeComunicar(abertas.map((l) => l.decisao));
    if (!chk.ok) { setToast({ texto: `Ainda há ${chk.semDecisao} iniciativa(s) sem decisão. Decida todas antes de comunicar.`, ok: false }); return; }
    start(async () => { const r = await comunicarDecisoes(); setToast({ texto: r.ok ? r.msg ?? '' : r.erro, ok: r.ok }); });
  }

  const sKpi = s('flex: 1 1 140px; background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px');

  return (
    <>
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Gestão / {p.cicloNome ? `Ciclo ${p.cicloNome} / ` : ''}Avaliação</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Avaliação e priorização</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Dê notas de 1 a 5 em cada critério. O TARS calcula a nota final com os pesos da empresa e ordena a lista.</p>
        </div>
        <button type="button" disabled={pend || !p.cicloNome} onClick={comunicar} style={s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Comunicar decisões às áreas</button>
      </div>

      {toast && (
        <div role="status" style={{ ...s('display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600'), background: toast.ok ? '#EFEAFE' : '#FEF3DC', color: toast.ok ? '#3A22A8' : '#6B3F03' }}>
          <span>{toast.texto}</span>{toast.ok && <Link href="/portfolio" style={s('font-size: 13px; font-weight: 700')}>Ver no portfólio</Link>}
        </div>
      )}

      {!p.cicloNome && <div style={s('padding: 14px 16px; border-radius: 12px; background: #F3F0EA; font-size: 13px; color: #4A4458')}>Não há ciclo em andamento. Abra um ciclo em Ciclos de planejamento.</div>}

      <div style={s('display: flex; flex-wrap: wrap; gap: 12px')}>
        <div style={s('flex: 2 1 360px; background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px')}>
          <div style={s('display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap')}><span style={s('font-size: 12px; color: #5E5770')}>Custo das pré-aprovadas vs. orçamento de referência</span><span style={{ ...s('font-size: 13px; font-weight: 700'), color: passou ? '#B42318' : '#26213A' }}>{money(total)} de {money(p.orcamento)} ({pct}%)</span></div>
          <div style={s('height: 10px; border-radius: 5px; background: #EFEBE3; overflow: hidden')}><div style={{ ...s('height: 10px; border-radius: 5px'), width: `${Math.min(pct, 100)}%`, background: passou ? '#B42318' : '#6D4AFF' }} /></div>
        </div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Pré-aprovadas</span><span style={s('font-size: 24px; font-weight: 700')}>{pre.length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Backlog</span><span style={s('font-size: 24px; font-weight: 700')}>{linhas.filter((l) => l.decisao === 'bkl').length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Sem decisão</span><span style={s('font-size: 24px; font-weight: 700')}>{linhas.filter((l) => !l.decisao).length}</span></div>
      </div>

      <div style={s('display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 12px; color: #4A4458')}>
        <span style={s('font-weight: 600')}>Pesos:</span>
        {p.pesos.map((x) => <span key={x.nome} style={s('padding: 4px 10px; border-radius: 10px; background: #EDEAE3')}>{x.nome} {x.peso}%</span>)}
        {p.podeAjustarPesos && <Link href="/cadastros?aba=criterios" style={s('font-size: 12px; font-weight: 600')}>Ajustar em Cadastros</Link>}
      </div>

      {p.alerta && (
        <div style={s('padding: 12px 14px; border-radius: 12px; background: #FEF3DC; color: #6B3F03; font-size: 13px; line-height: 1.5')}>
          <strong>Concorrência de recursos:</strong> {p.alerta.titulo} precisaria do time de {p.alerta.area}, que já tem {p.alerta.pessoa} acima do cedido{p.alerta.projeto ? ` no ${p.alerta.projeto}` : ''}. Avalie a capacidade antes de pré-aprovar.
        </div>
      )}

      <div style={s('overflow-x: auto; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px')}>
        <div style={s('min-width: 1060px')}>
          <div style={s(GRADE + '; padding: 12px 16px; font-size: 12px; color: #5E5770; font-weight: 600; border-bottom: 1px solid #EFEBE3; background: #FAF8F4')}>
            <span>Iniciativa</span><span>Impacto</span><span>Urgência</span><span>Alinhamento</span><span>Facilidade</span><span>Nota</span><span>Decisão</span>
          </div>
          {ordenadas.map((r) => {
            const nota = notaFinal(r.notas, pesos);
            const trava = r.comunicado;
            return (
              <div key={r.id} style={s('border-bottom: 1px solid #F3F0EA; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px')}>
                <div style={s(GRADE + '; align-items: center')}>
                  <div style={s('display: flex; flex-direction: column; gap: 3px; min-width: 0')}>
                    <span style={s('font-size: 14px; font-weight: 600')}>{r.titulo}</span>
                    <span style={s('font-size: 12px; color: #5E5770')}>{r.area} · {r.tipo} · {r.custoLabel}</span>
                    {r.obrigatoria && <span style={s('font-size: 11px; font-weight: 600; color: #7A4A04')}>Obrigatória: entra independente da nota</span>}
                    {trava && <span style={s('font-size: 11px; font-weight: 600; color: #5E5770')}>Decisão já comunicada</span>}
                  </div>
                  {CRIT.map((nome, ci) => (
                    <div key={ci} style={s('display: flex; gap: 3px')}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const on = n <= (r.notas[ci] ?? 0);
                        return (
                          <button key={n} type="button" disabled={trava} aria-label={`${nome} ${n} de 5 para ${r.titulo}`}
                            onClick={() => mudar(r.id, (l) => { const notas = l.notas.slice(); notas[ci] = n; return { ...l, notas }; }, () => darNota(r.id, ci, n))}
                            style={{ ...s('width: 24px; height: 28px; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 0'), border: `1px solid ${on ? '#6D4AFF' : '#E2DCD0'}`, background: on ? '#6D4AFF' : '#FFFFFF', color: on ? '#FFFFFF' : '#8A8296' }}>{n}</button>
                        );
                      })}
                    </div>
                  ))}
                  <span style={{ ...s('font-size: 18px; font-weight: 700'), color: nota === null ? '#8A8296' : nota >= 70 ? '#3A22A8' : nota >= 55 ? '#26213A' : '#6E6780' }}>{nota ?? '—'}</span>
                  <div style={s('display: flex; gap: 4px; flex-wrap: wrap')}>
                    {([['pre', 'Pré-aprovar'], ['bkl', 'Backlog'], ['rec', 'Recusar']] as const).map(([k, rot]) => {
                      const on = r.decisao === k;
                      const bg = on ? (k === 'pre' ? '#6D4AFF' : k === 'bkl' ? '#4A4458' : '#26213A') : '#FFFFFF';
                      return (
                        <button key={k} type="button" disabled={trava} aria-pressed={on}
                          onClick={() => { const nova: Dec = on ? null : k; mudar(r.id, (l) => ({ ...l, decisao: nova, motivoRecusa: nova === 'rec' ? l.motivoRecusa ?? p.motivos[0] ?? null : l.motivoRecusa }), () => decidir(r.id, nova)); }}
                          style={{ ...s('height: 32px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 600'), border: `1px solid ${on ? bg : '#E2DCD0'}`, background: bg, color: on ? '#FFFFFF' : '#4A4458' }}>{rot}</button>
                      );
                    })}
                  </div>
                </div>
                {r.decisao === 'rec' && (
                  <label style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; padding-left: 4px')}>Motivo da recusa
                    <select value={r.motivoRecusa ?? p.motivos[0]} disabled={trava} onChange={(e) => { const m = e.target.value; mudar(r.id, (l) => ({ ...l, motivoRecusa: m }), () => definirMotivoRecusa(r.id, m)); }}
                      style={s('height: 38px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF')}>
                      {p.motivos.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </label>
                )}
              </div>
            );
          })}
          {ordenadas.length === 0 && <div style={s('padding: 18px 16px; font-size: 13px; color: #5E5770')}>Nenhuma iniciativa aguardando avaliação. Elas aparecem aqui depois de aprovadas pelos gestores.</div>}
        </div>
      </div>
    </>
  );
}
