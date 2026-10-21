'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { addDias, br } from '@/lib/regras/datas';
import { desvio as calcDesvio, farolSugerido, fimDoPlano, FAROL, mesesDaLinha, rotuloDesvioCurto, type Fase, type Farol } from '@/lib/regras/projeto';
import * as A from '@/app/acoes/projeto';

type FaseVM = Fase & { criterio: string; confirmada: string | null };
type Props = {
  id: string; titulo: string; cabecalho: string; patrocinio: string; farol: Farol;
  inicio: string; inicioLabel: string; hoje: string; semanaHoje: number;
  fases: FaseVM[]; base: Fase[] | null; biblioteca: { id: string; nome: string; dur: number }[];
  tarefas: { id: string; faseId: string | null; titulo: string; responsavelId: string | null; prazo: string | null; concluida: boolean }[];
  alocs: { faseId: string; pessoaId: string; pct: number }[];
  pessoas: { id: string; nome: string; ini: string; papel: string; cap: number | null; noProjeto: boolean }[];
  marcos: { id: string; faseId: string; nome: string; data: string | null; status: string }[];
  riscos: { id: string; faseId: string; nome: string; nivel: string }[];
  reports: { id: string; data: string; farol: string; desvio: string; a: string; b: string; c: string }[];
  mudanca: { id: string; descricao: string; solicitante: string } | null;
  ehPmo: boolean; gpId: string; faseInicial: string;
};

const W = 30; // px por semana

function msEstilo(status: string) {
  const c = status === 'Atingido' ? ['#E3F5EA', '#17723D'] : status === 'Em risco' ? ['#FEF3DC', '#9A5B05'] : ['#EDEAE3', '#4A4458'];
  return {
    pill: { ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; border: 0; cursor: pointer'), background: c[0], color: c[1] },
    chip: { ...s('display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: c[0], color: c[1] },
    diamante: { ...s('width: 12px; height: 12px; transform: rotate(45deg); border-radius: 2px; flex: 0 0 12px; border: 2px solid #6D4AFF'), background: status === 'Previsto' ? '#FFFFFF' : '#6D4AFF' },
  };
}
function rkEstilo(nivel: string) {
  const c = nivel === 'Alto' ? ['#FDE8E8', '#B42318'] : nivel === 'Médio' ? ['#FEF3DC', '#9A5B05'] : ['#EDEAE3', '#4A4458'];
  return { ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; flex: 0 0 auto'), background: c[0], color: c[1] };
}

export function TelaProjeto({ p }: { p: Props }) {
  const [fases, setFases] = useState<FaseVM[]>(p.fases);
  const [drag, setDrag] = useState<{ id: string; modo: 'mover' | 'redim'; x0: number; s0: number; d0: number } | null>(null);
  const [sel, setSel] = useState(p.faseInicial);
  const [farol, setFarol] = useState<Farol>(p.farol);
  const [aviso, setAviso] = useState('');
  const [pend, start] = useTransition();
  useEffect(() => { if (!drag) setFases(p.fases); }, [p.fases]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setFarol(p.farol), [p.farol]);
  const moveu = useRef(false);

  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, mostrar = false) => start(async () => {
    const r = await fn();
    if (!r.ok) setAviso(r.erro ?? 'Erro');
    else if (mostrar && r.msg) setAviso(r.msg);
  });

  const pessoa = (id: string | null) => p.pessoas.find((x) => x.id === id);
  const dataSemana = (w: number) => addDias(p.inicio, Math.round(w * 7));
  const statusFase = (f: Fase) => { const fim = dataSemana(f.inicioSemana + f.duracao); if (fim <= p.hoje) return 'Concluída'; return dataSemana(f.inicioSemana) <= p.hoje ? 'Em andamento' : 'Planejada'; };
  const datasDe = (f: Fase) => `${br(dataSemana(f.inicioSemana)).slice(0, 5)} a ${br(dataSemana(f.inicioSemana + f.duracao)).slice(0, 5)}`;

  const fim = fimDoPlano(fases);
  const semanas = Math.max(26, fim + 2, Math.ceil(p.semanaHoje) + 2);
  const meses = useMemo(() => mesesDaLinha(p.inicio, semanas), [p.inicio, semanas]);
  const dv = calcDesvio(fases, p.base);
  const acimaIds = [...new Set(p.alocs.filter((a) => { const pe = pessoa(a.pessoaId); return pe && pe.cap != null && a.pct > pe.cap; }).map((a) => a.pessoaId))];
  const sug = farolSugerido(dv, acimaIds.length);
  const feitas = p.tarefas.filter((t) => t.concluida).length;

  function onMove(e: React.PointerEvent) {
    if (!drag) return;
    const dw = Math.round((e.clientX - drag.x0) / W);
    setFases((fs) => fs.map((f) => {
      if (f.id !== drag.id) return f;
      if (drag.modo === 'mover') { const ns = Math.max(0, drag.s0 + dw); if (ns !== f.inicioSemana) moveu.current = true; return { ...f, inicioSemana: ns }; }
      const nd = Math.max(1, drag.d0 + dw); if (nd !== f.duracao) moveu.current = true; return { ...f, duracao: nd };
    }));
  }
  function onUp() {
    if (!drag) return;
    const f = fases.find((x) => x.id === drag.id);
    setDrag(null);
    if (f && moveu.current) rodar(() => A.moverFase(f.id, f.inicioSemana, f.duracao));
    moveu.current = false;
  }

  const atual = fases.find((f) => f.id === sel);
  const usadas = fases.map((f) => f.nome);
  const tabEstilo = (on: boolean) => ({ ...s('height: 36px; padding: 0 12px; border-radius: 18px; font-size: 12px'), fontWeight: on ? 700 : 500, border: `1px solid ${on ? '#6D4AFF' : '#E2DCD0'}`, background: on ? '#EFEAFE' : '#FFFFFF', color: on ? '#3A22A8' : '#4A4458' });
  const sKpi = s('background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px');

  return (
    <>
      {p.mudanca && (
        <div style={s('display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 12px; background: #FEF3DC; color: #6B3F03; font-size: 13px')}>
          <span><strong>Pedido para alterar a linha de base:</strong> {p.mudanca.solicitante} pede {p.mudanca.descricao}.{!p.ehPmo && ' Aguardando o PMO.'}</span>
          {p.ehPmo && (
            <span style={s('display: flex; gap: 8px')}>
              <button type="button" disabled={pend} onClick={() => rodar(() => A.decidirMudancaBase(p.mudanca!.id, false), true)} style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 1px solid #E8CF9C; background: #FFFFFF; color: #4A3205; font-size: 12px')}>Recusar</button>
              <button type="button" disabled={pend} onClick={() => rodar(() => A.decidirMudancaBase(p.mudanca!.id, true), true)} style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 12px')}>Aprovar mudança</button>
            </span>
          )}
        </div>
      )}
      {aviso && <div role="status" style={s('padding: 12px 16px; border-radius: 12px; background: #EFEAFE; color: #3A22A8; font-size: 13px; font-weight: 600')}>{aviso}</div>}

      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-start')}>
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          <span style={s('font-size: 12px; color: #5E5770; font-weight: 600; letter-spacing: 0.3px')}>{p.cabecalho}</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>{p.titulo}</h1>
          <span style={s('font-size: 13px; color: #5E5770')}>{p.patrocinio}</span>
        </div>
        <div style={s('display: flex; flex-direction: column; gap: 6px; align-items: flex-end')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Farol do projeto</span>
          <div style={s('display: flex; gap: 6px')}>
            {(['ok', 'aten', 'crit'] as Farol[]).map((k) => {
              const o = FAROL[k], on = farol === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => { setFarol(k); rodar(() => A.definirFarol(p.id, k)); }}
                  style={{ ...s('display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 18px; font-size: 13px; font-weight: 600'), border: on ? `2px solid ${o.fg}` : '1px solid #E2DCD0', background: on ? o.bg : '#FFFFFF', color: on ? o.fg : '#4A4458' }}>
                  <span style={{ ...s('width: 8px; height: 8px; border-radius: 50%'), background: o.fg }} />{o.rotulo}
                </button>
              );
            })}
          </div>
          <span style={s('font-size: 12px; color: #4A4458')}>Sugerido pelo TARS: <strong>{FAROL[sug.farol].rotulo}</strong> · {sug.porque}</span>
        </div>
      </div>

      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px')}>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Início</span><span style={s('font-size: 20px; font-weight: 700')}>{p.inicioLabel}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Fim previsto</span><span style={s('font-size: 20px; font-weight: 700')}>{br(dataSemana(fim))}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Desvio da linha de base</span><span style={{ ...s('font-size: 20px; font-weight: 700'), color: dv === null ? '#5E5770' : dv > 2 ? '#B42318' : dv > 0 ? '#9A5B05' : '#17723D' }}>{rotuloDesvioCurto(dv)}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Tarefas concluídas</span><span style={s('font-size: 20px; font-weight: 700')}>{feitas} de {p.tarefas.length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Acima do cedido</span><span style={{ ...s('font-size: 20px; font-weight: 700'), color: acimaIds.length ? '#9A5B05' : '#26213A' }}>{acimaIds.length} {acimaIds.length === 1 ? 'pessoa' : 'pessoas'}</span></div>
      </div>

      <section aria-label="Linha do tempo" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center')}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Linha do tempo</h2><span style={s('font-size: 12px; color: #5E5770')}>{p.base ? 'Linha de base congelada. Mudanças agora geram desvio.' : 'Gerada a partir do modelo e das datas da iniciativa. Arraste as barras e congele a linha de base.'}</span></div>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.recriarDoModelo(p.id))} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Recriar a partir do modelo</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.congelarLinhaBase(p.id), true)} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>{p.base ? 'Atualizar linha de base' : 'Congelar linha de base'}</button>
          </div>
        </div>
        <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
          <div onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} style={{ ...s('user-select: none'), minWidth: 240 + semanas * W }}>
            <div style={s('display: flex; border-bottom: 1px solid #EFEBE3; background: #FAF8F4')}>
              <div style={s('flex: 0 0 240px; padding: 8px 12px; font-size: 12px; color: #5E5770; font-weight: 600')}>Fase · clique para detalhar</div>
              <div style={{ display: 'flex', flex: `0 0 ${semanas * W}px` }}>
                {meses.map(([r, n], i) => <div key={i} style={{ ...s('padding: 8px; box-sizing: border-box; font-size: 12px; font-weight: 600; color: #4A4458; border-left: 1px solid #EFEBE3; white-space: nowrap; overflow: hidden'), flex: `0 0 ${n * W}px` }}>{r}</div>)}
              </div>
            </div>
            {fases.map((f) => {
              const st = statusFase(f);
              const base = p.base?.find((b) => b.id === f.id);
              const on = sel === f.id;
              const arrastando = drag?.id === f.id;
              return (
                <div key={f.id} style={{ ...s('display: flex; border-bottom: 1px solid #F3F0EA'), background: on ? '#F6F3FF' : '#FFFFFF' }}>
                  <div style={s('flex: 0 0 240px; padding: 6px 8px 6px 12px; display: flex; align-items: center; gap: 6px; box-sizing: border-box')}>
                    <button type="button" aria-pressed={on} onClick={() => setSel(on ? '' : f.id)} style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; border: 0; background: transparent; padding: 4px 0; text-align: left; color: #26213A')}>
                      <span style={s('font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px')}>{f.nome}</span>
                      <span style={{ fontSize: 11, color: st === 'Em andamento' ? '#4B2FD1' : '#6E6780' }}>{st}{f.confirmada ? ' · confirmada' : ''}</span>
                    </button>
                    <button type="button" aria-label={`Remover fase ${f.nome}`} onClick={() => { if (confirm(`Remover a fase "${f.nome}"? As tarefas, alocações, marcos e riscos dela também serão apagados.`)) rodar(() => A.removerFase(f.id)); }} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
                  </div>
                  <div style={{ ...s('position: relative; height: 52px'), flex: `0 0 ${semanas * W}px`, backgroundImage: 'linear-gradient(to right, #F3F0EA 1px, transparent 1px)', backgroundSize: `${W}px 52px` }}>
                    <div style={{ ...s('position: absolute; top: 0; bottom: 0; width: 2px; background: #B42318; opacity: 0.6'), left: p.semanaHoje * W }} />
                    {base && <div style={{ ...s('position: absolute; top: 40px; height: 4px; border-radius: 2px; background: #B8AFA0'), left: base.inicioSemana * W + 2, width: base.duracao * W - 4 }} />}
                    <div onPointerDown={(e) => { e.preventDefault(); moveu.current = false; setDrag({ id: f.id, modo: 'mover', x0: e.clientX, s0: f.inicioSemana, d0: f.duracao }); }}
                      style={{ ...s('position: absolute; top: 9px; height: 26px; border-radius: 7px; color: #FFFFFF; display: flex; align-items: center; padding-left: 8px; box-sizing: border-box; touch-action: none'), left: f.inicioSemana * W + 2, width: f.duracao * W - 4, background: st === 'Concluída' ? '#9C8CF0' : '#6D4AFF', cursor: arrastando ? 'grabbing' : 'grab', boxShadow: arrastando || on ? '0 0 0 3px #CFC4FF' : 'none' }}>
                      <span style={s('font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1')}>{f.duracao} {f.duracao === 1 ? 'semana' : 'semanas'} · {br(dataSemana(f.inicioSemana)).slice(0, 5)}</span>
                      <span aria-hidden="true" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); moveu.current = false; setDrag({ id: f.id, modo: 'redim', x0: e.clientX, s0: f.inicioSemana, d0: f.duracao }); }} style={s('width: 10px; align-self: stretch; cursor: ew-resize; display: flex; align-items: center; justify-content: center')}><span style={s('width: 2px; height: 14px; border-radius: 1px; background: rgba(255,255,255,0.7)')} /></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center')}>
          <span style={s('font-size: 12px; color: #5E5770; font-weight: 600')}>Biblioteca de fases · clique para adicionar:</span>
          {p.biblioteca.filter((b) => !usadas.includes(b.nome)).map((b) => (
            <button key={b.id} type="button" disabled={pend} onClick={() => rodar(() => A.adicionarFase(p.id, b.id))} style={s('min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #3A22A8; font-size: 12px; font-weight: 600')}>+ {b.nome}</button>
          ))}
        </div>
      </section>

      <section aria-label="Tarefas e pessoas por fase" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Planejamento por fase</h2><span style={s('font-size: 12px; color: #5E5770')}>Escolha uma fase para cadastrar tarefas, alocar pessoas e registrar marcos e riscos. Sem fase escolhida, tudo aparece agrupado.</span></div>
        <div role="tablist" aria-label="Fase" style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
          <button type="button" role="tab" aria-selected={!atual} onClick={() => setSel('')} style={tabEstilo(!atual)}>Todas as fases</button>
          {fases.map((f) => <button key={f.id} type="button" role="tab" aria-selected={sel === f.id} onClick={() => setSel(f.id)} style={tabEstilo(sel === f.id)}>{f.nome}</button>)}
        </div>
        {!atual ? <Grupos p={p} fases={fases} statusFase={statusFase} datasDe={datasDe} setSel={setSel} rodar={rodar} /> : <DetalheFase key={atual.id} p={p} f={atual} status={statusFase(atual)} datas={datasDe(atual)} rodar={rodar} pend={pend} />}
      </section>

      <StatusProjeto p={p} rodar={rodar} pend={pend} />
    </>
  );
}

type Rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, mostrar?: boolean) => void;

function LinhaTarefa({ p, t, comRemover, rodar }: { p: Props; t: Props['tarefas'][number]; comRemover: boolean; rodar: Rodar }) {
  const atrasada = !t.concluida && !!t.prazo && t.prazo < p.hoje;
  const quem = p.pessoas.find((x) => x.id === t.responsavelId);
  const Tag = comRemover ? 'div' : 'label';
  return (
    <Tag style={comRemover ? s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; border: 1px solid #EFEBE3') : s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; background: #FAF8F4; cursor: pointer')}>
      <input type="checkbox" checked={t.concluida} aria-label={`Concluir ${t.titulo}`} onChange={() => rodar(() => A.alternarTarefa(t.id))} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />
      <span style={{ ...s('flex: 1 1 200px; font-size: 13px; font-weight: 600'), color: t.concluida ? '#8A8296' : '#26213A', textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</span>
      <span style={s('font-size: 12px; color: #5E5770')}>{quem?.nome ?? ''}</span>
      <span style={{ fontSize: 12, fontWeight: atrasada ? 700 : 400, color: atrasada ? '#B42318' : '#5E5770' }}>{t.prazo ? (atrasada ? `Atrasada · ${br(t.prazo)}` : `Prazo ${br(t.prazo)}`) : 'Sem prazo'}</span>
      {comRemover && <button type="button" aria-label={`Remover tarefa ${t.titulo}`} onClick={() => rodar(() => A.removerTarefa(t.id))} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>}
    </Tag>
  );
}

function Grupos({ p, fases, statusFase, datasDe, setSel, rodar }: { p: Props; fases: FaseVM[]; statusFase: (f: Fase) => string; datasDe: (f: Fase) => string; setSel: (id: string) => void; rodar: Rodar }) {
  return (
    <div style={s('display: flex; flex-direction: column; gap: 10px')}>
      {fases.map((f) => {
        const ppl = p.alocs.filter((a) => a.faseId === f.id);
        const tks = p.tarefas.filter((t) => t.faseId === f.id);
        const ms = p.marcos.filter((m) => m.faseId === f.id);
        const rk = p.riscos.filter((r) => r.faseId === f.id);
        return (
          <div key={f.id} style={s('border: 1px solid #EFEBE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px')}>
            <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center')}>
              <button type="button" onClick={() => setSel(f.id)} style={s('display: flex; flex-direction: column; align-items: flex-start; border: 0; background: transparent; padding: 0; text-align: left; color: #26213A')}><span style={s('font-size: 15px; font-weight: 700')}>{f.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{datasDe(f)} · {statusFase(f)}</span></button>
              <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
                {ppl.map((a) => {
                  const pe = p.pessoas.find((x) => x.id === a.pessoaId);
                  const over = pe && pe.cap != null && a.pct > pe.cap;
                  return <span key={a.pessoaId} style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: over ? '#FEF3DC' : '#EFEAFE', color: over ? '#7A4A04' : '#3A22A8' }}>{pe?.nome.split(' ')[0]} {a.pct}%</span>;
                })}
                {ppl.length === 0 && <span style={s('font-size: 12px; color: #9A5B05; font-weight: 600')}>Sem pessoas alocadas</span>}
              </div>
            </div>
            {tks.map((t) => <LinhaTarefa key={t.id} p={p} t={t} comRemover={false} rodar={rodar} />)}
            {tks.length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nenhuma tarefa cadastrada.</span>}
            {ms.length + rk.length > 0 && (
              <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
                {ms.map((m) => <span key={m.id} style={msEstilo(m.status).chip}><span style={s('width: 7px; height: 7px; transform: rotate(45deg); background: currentColor')} />Marco: {m.nome} · {br(m.data)} · {m.status}</span>)}
                {rk.map((r) => <span key={r.id} style={{ ...rkEstilo(r.nivel), flex: undefined }}>Risco {r.nivel.toLowerCase()}: {r.nome}</span>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const sForm = s('display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; padding: 12px; border-radius: 12px; background: #F7F5F0');
const sMini = s('height: 40px; padding: 0 10px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A; background: #FFFFFF');
const sMiniLab = s('display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600');
const sAdd = s('height: 40px; padding: 0 14px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px');

function DetalheFase({ p, f, status, datas, rodar, pend }: { p: Props; f: FaseVM; status: string; datas: string; rodar: Rodar; pend: boolean }) {
  const equipe = p.pessoas.filter((x) => x.noProjeto);
  const [novo, setNovo] = useState({ titulo: '', quem: p.gpId || equipe[0]?.id || '', prazo: '' });
  const [ms, setMs] = useState({ nome: '', data: '' });
  const [rk, setRk] = useState({ nome: '', nivel: 'Alto' });
  const naFase = p.alocs.filter((a) => a.faseId === f.id);
  const livres = p.pessoas.filter((x) => !naFase.some((a) => a.pessoaId === x.id)).sort((a, b) => Number(b.noProjeto) - Number(a.noProjeto) || a.nome.localeCompare(b.nome));
  const [quemAlocar, setQuemAlocar] = useState('');
  const alocarId = quemAlocar || livres[0]?.id || '';

  return (
    <div style={s('display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start')}>
      <div style={s('flex: 999 1 440px; min-width: 0; display: flex; flex-direction: column; gap: 10px')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><span style={s('font-size: 15px; font-weight: 700')}>Tarefas · {f.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{datas} · {status}</span></div>
        {p.tarefas.filter((t) => t.faseId === f.id).map((t) => <LinhaTarefa key={t.id} p={p} t={t} comRemover rodar={rodar} />)}
        <div style={sForm}>
          <label style={{ ...sMiniLab, flex: '2 1 200px' }}>Nova tarefa<input type="text" value={novo.titulo} onChange={(e) => setNovo({ ...novo, titulo: e.target.value })} placeholder="Descreva a entrega" style={sMini} /></label>
          <label style={{ ...sMiniLab, flex: '1 1 150px' }}>Responsável<select value={novo.quem} onChange={(e) => setNovo({ ...novo, quem: e.target.value })} style={sMini}>{(equipe.length ? equipe : p.pessoas).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
          <label style={{ ...sMiniLab, flex: '1 1 140px' }}>Prazo<input type="date" value={novo.prazo} onChange={(e) => setNovo({ ...novo, prazo: e.target.value })} style={sMini} /></label>
          <button type="button" disabled={pend || !novo.titulo.trim()} onClick={() => { rodar(() => A.adicionarTarefa(f.id, novo.titulo, novo.quem, novo.prazo)); setNovo({ ...novo, titulo: '', prazo: '' }); }} style={sAdd}>Adicionar</button>
        </div>
        <div style={s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; border: 1px dashed #D6CFC2')}>
          <span style={s('flex: 1 1 240px; font-size: 13px; color: #4A4458')}><strong>Critério para concluir:</strong> {f.criterio || 'entregas da fase concluídas'}{f.confirmada ? ` · fim confirmado em ${f.confirmada}` : ''}</span>
          <button type="button" disabled={pend} onClick={() => rodar(() => A.confirmarFimFase(f.id))} style={f.confirmada ? s('height: 36px; padding: 0 12px; border-radius: 9px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 12px') : s('height: 36px; padding: 0 12px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 12px')}>{f.confirmada ? 'Reabrir fase' : 'Confirmar fim da fase'}</button>
        </div>
      </div>
      <div style={s('flex: 1 1 320px; min-width: 0; display: flex; flex-direction: column; gap: 10px')}>
        <span style={s('font-size: 15px; font-weight: 700')}>Pessoas nesta fase</span>
        {naFase.map((a) => {
          const pe = p.pessoas.find((x) => x.id === a.pessoaId);
          if (!pe) return null;
          const ext = pe.cap === null, over = !ext && a.pct > (pe.cap ?? 0);
          return (
            <div key={a.pessoaId} style={s('display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; border: 1px solid #EFEBE3')}>
              <div style={s('display: flex; align-items: center; gap: 8px')}>
                <span style={s('width: 28px; height: 28px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600')}>{pe.ini}</span>
                <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 13px; font-weight: 600')}>{pe.nome}</span><span style={s('font-size: 11px; color: #5E5770')}>{pe.papel}</span></span>
                <button type="button" aria-label={`Diminuir ${pe.nome}`} disabled={pend} onClick={() => rodar(() => A.ajustarAlocacao(f.id, pe.id, Math.max(10, a.pct - 10)))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A')}>−</button>
                <span style={s('min-width: 42px; text-align: center; font-size: 13px; font-weight: 700')}>{a.pct}%</span>
                <button type="button" aria-label={`Aumentar ${pe.nome}`} disabled={pend} onClick={() => rodar(() => A.ajustarAlocacao(f.id, pe.id, Math.min(100, a.pct + 10)))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A')}>+</button>
                <button type="button" aria-label={`Remover ${pe.nome} da fase`} disabled={pend} onClick={() => rodar(() => A.removerAlocacao(f.id, pe.id))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
              </div>
              <span style={{ fontSize: 12, color: over ? '#9A5B05' : '#5E5770', fontWeight: over ? 600 : 400 }}>{ext ? 'Externo: sem limite de cedência' : over ? `Acima do cedido (${pe.cap}%): pedido de aprovação enviado ao gestor da área` : `Dentro do cedido pelo gestor (${pe.cap ?? 0}%)`}</span>
            </div>
          );
        })}
        <div style={sForm}>
          <label style={{ ...sMiniLab, flex: '1 1 160px' }}>Alocar pessoa<select value={alocarId} onChange={(e) => setQuemAlocar(e.target.value)} style={sMini}>{livres.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
          <button type="button" disabled={pend || !alocarId} onClick={() => { rodar(() => A.alocarPessoa(f.id, alocarId)); setQuemAlocar(''); }} style={sAdd}>Alocar 20%</button>
        </div>

        <span style={s('font-size: 15px; font-weight: 700; margin-top: 6px')}>Marcos da fase</span>
        {p.marcos.filter((m) => m.faseId === f.id).map((m) => {
          const e = msEstilo(m.status);
          return (
            <div key={m.id} style={s('display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; border: 1px solid #EFEBE3')}>
              <span style={e.diamante} />
              <span style={s('display: flex; flex-direction: column; flex: 1')}><span style={s('font-size: 13px; font-weight: 600')}>{m.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{br(m.data)}</span></span>
              <button type="button" title="Clique para mudar o status" onClick={() => rodar(() => A.mudarStatusMarco(m.id))} style={e.pill}>{m.status}</button>
              <button type="button" aria-label={`Remover marco ${m.nome}`} onClick={() => rodar(() => A.removerMarco(m.id))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
            </div>
          );
        })}
        {p.marcos.filter((m) => m.faseId === f.id).length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nenhum marco nesta fase.</span>}
        <div style={sForm}>
          <label style={{ ...sMiniLab, flex: '2 1 140px' }}>Novo marco<input type="text" value={ms.nome} onChange={(e) => setMs({ ...ms, nome: e.target.value })} placeholder="Entrega-chave" style={sMini} /></label>
          <label style={{ ...sMiniLab, flex: '1 1 120px' }}>Data<input type="date" value={ms.data} onChange={(e) => setMs({ ...ms, data: e.target.value })} style={sMini} /></label>
          <button type="button" disabled={pend || !ms.nome.trim()} onClick={() => { rodar(() => A.adicionarMarco(f.id, ms.nome, ms.data)); setMs({ nome: '', data: '' }); }} style={sAdd}>Adicionar</button>
        </div>

        <span style={s('font-size: 15px; font-weight: 700; margin-top: 6px')}>Riscos da fase</span>
        {p.riscos.filter((r) => r.faseId === f.id).map((r) => (
          <div key={r.id} style={s('display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; border: 1px solid #EFEBE3')}>
            <span style={rkEstilo(r.nivel)}>{r.nivel}</span><span style={s('flex: 1; font-size: 13px; font-weight: 600')}>{r.nome}</span>
            <button type="button" aria-label={`Remover risco ${r.nome}`} onClick={() => rodar(() => A.removerRisco(r.id))} style={s('width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
          </div>
        ))}
        {p.riscos.filter((r) => r.faseId === f.id).length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Nenhum risco nesta fase.</span>}
        <div style={sForm}>
          <label style={{ ...sMiniLab, flex: '2 1 140px' }}>Novo risco<input type="text" value={rk.nome} onChange={(e) => setRk({ ...rk, nome: e.target.value })} placeholder="O que pode dar errado?" style={sMini} /></label>
          <label style={{ ...sMiniLab, flex: '1 1 100px' }}>Nível<select value={rk.nivel} onChange={(e) => setRk({ ...rk, nivel: e.target.value })} style={sMini}><option>Alto</option><option>Médio</option><option>Baixo</option></select></label>
          <button type="button" disabled={pend || !rk.nome.trim()} onClick={() => { rodar(() => A.adicionarRisco(f.id, rk.nome, rk.nivel)); setRk({ ...rk, nome: '' }); }} style={sAdd}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}

function StatusProjeto({ p, rodar, pend }: { p: Props; rodar: Rodar; pend: boolean }) {
  const [rasc, setRasc] = useState({ data: p.hoje, a: '', b: '', c: '' });
  const [erro, setErro] = useState(false);
  const sArea = s('padding: 10px 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 13px; font-weight: 400; color: #26213A; resize: vertical');
  return (
    <section id="status" aria-label="Status da semana" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
      <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Status do projeto</h2><span style={s('font-size: 12px; color: #5E5770')}>Visão geral do projeto, não de uma fase. O TARS junta com farol e desvio e envia ao patrocinador e ao PMO.</span></div>
        <label style={s('display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600')}>Data<input type="date" value={rasc.data} onChange={(e) => { setRasc({ ...rasc, data: e.target.value }); setErro(false); }} style={s('height: 40px; padding: 0 8px; border-radius: 9px; border: 1px solid #E2DCD0; font-size: 13px; color: #26213A')} /></label>
      </div>
      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px')}>
        <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>O que avançou?<textarea rows={3} value={rasc.a} onChange={(e) => { setRasc({ ...rasc, a: e.target.value }); setErro(false); }} placeholder="Catálogo entregue para testes internos." style={sArea} /></label>
        <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>O que vem a seguir?<textarea rows={3} value={rasc.b} onChange={(e) => setRasc({ ...rasc, b: e.target.value })} placeholder="Integração com o ERP." style={sArea} /></label>
        <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Pontos de atenção<textarea rows={3} value={rasc.c} onChange={(e) => setRasc({ ...rasc, c: e.target.value })} placeholder="API depende do time de TI." style={sArea} /></label>
      </div>
      {erro && <span style={s('font-size: 13px; color: #B42318')}>Preencha a data e ao menos “O que avançou?” para publicar.</span>}
      <div style={s('display: flex; justify-content: flex-end')}>
        <button type="button" disabled={pend} onClick={() => {
          if (!rasc.a.trim() || !rasc.data) { setErro(true); return; }
          rodar(() => A.publicarStatus(p.id, rasc.data, rasc.a, rasc.b, rasc.c), true);
          setRasc({ ...rasc, a: '', b: '', c: '' });
        }} style={s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Publicar status</button>
      </div>
      <div style={s('border-top: 1px solid #EFEBE3; padding-top: 12px; display: flex; flex-direction: column; gap: 10px')}>
        <span style={s('font-size: 12px; font-weight: 700; color: #5E5770; letter-spacing: 0.3px')}>STATUS ANTERIORES</span>
        {p.reports.map((r) => {
          const f = FAROL[r.farol as Farol] ?? FAROL.ok;
          return (
            <div key={r.id} style={s('padding: 12px 14px; border-radius: 12px; background: #F7F5F0; display: flex; flex-direction: column; gap: 4px')}>
              <span style={s('display: flex; flex-wrap: wrap; gap: 8px; align-items: center')}><span style={s('font-size: 13px; font-weight: 700')}>{br(r.data)}</span><span style={{ ...s('font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px'), background: f.bg, color: f.fg }}>{f.rotulo}</span><span style={s('font-size: 12px; color: #5E5770')}>{r.desvio}</span></span>
              <span style={s('font-size: 13px')}><strong>Avançou:</strong> {r.a}</span>
              <span style={s('font-size: 13px')}><strong>A seguir:</strong> {r.b}</span>
              <span style={s('font-size: 13px')}><strong>Atenção:</strong> {r.c}</span>
            </div>
          );
        })}
        {p.reports.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Nenhum status publicado ainda.</span>}
      </div>
    </section>
  );
}
