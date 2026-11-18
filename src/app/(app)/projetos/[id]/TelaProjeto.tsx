'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { addDias, br } from '@/lib/regras/datas';
import { desvio as calcDesvio, fimDoPlano, FAROL, mesesDaLinha, reordenar, rotuloDesvioCurto, type Fase, type Farol } from '@/lib/regras/projeto';
import * as A from '@/app/acoes/projeto';
import { dimPrazo, farolGeral, type Dimensao } from '@/lib/regras/farol';
import { RiscosFase, type RiscoVM } from './RiscosFase';
import { PainelFase } from './PainelFase';
import { envelopeDosPeriodos, ordenarPeriodos, rotuloPeriodo, siglaEquipe } from '@/lib/regras/projeto';

type FaseVM = Fase & { criterio: string; confirmada: string | null; responsavelId: string | null };
type Props = {
  id: string; titulo: string; cabecalho: string; patrocinio: string; farol: Farol;
  inicio: string; inicioLabel: string; hoje: string; semanaHoje: number;
  fases: FaseVM[]; base: Fase[] | null; biblioteca: { id: string; nome: string; dur: number }[];
  tarefas: { id: string; faseId: string | null; titulo: string; responsavelId: string | null; prazo: string | null; concluida: boolean }[];
  alocs: { faseId: string; periodoId: string; pessoaId: string; pct: number }[];
  periodos: { id: string; faseId: string; inicioSemana: number; duracao: number }[];
  pessoas: { id: string; nome: string; ini: string; papel: string; cap: number | null; noProjeto: boolean }[];
  marcos: { id: string; faseId: string; nome: string; data: string | null; status: string }[];
  riscos: RiscoVM[];
  reports: { id: string; data: string; farol: string; desvio: string; a: string; b: string; c: string }[];
  mudanca: { id: string; descricao: string; solicitante: string } | null;
  ehPmo: boolean; gpId: string; faseInicial: string;
  dimensoes: Dimensao[]; // custo, escopo e riscos (o prazo é calculado aqui, ao vivo)
};

const W = 30; // px por semana
const ROW = 53; // altura de uma linha de fase (52px + borda)
const COL = 280; // largura da coluna com o nome da fase

function msEstilo(status: string) {
  const c = status === 'Atingido' ? ['#E3F5EA', '#17723D'] : status === 'Em risco' ? ['#FEF3DC', '#9A5B05'] : ['#EDEAE3', '#4A4458'];
  return {
    pill: { ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; border: 0; cursor: pointer'), background: c[0], color: c[1] },
    chip: { ...s('display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: c[0], color: c[1] },
    diamante: { ...s('width: 12px; height: 12px; transform: rotate(45deg); border-radius: 2px; flex: 0 0 12px; border: 2px solid #6D4AFF'), background: status === 'Previsto' ? '#FFFFFF' : '#6D4AFF' },
  };
}

export function TelaProjeto({ p }: { p: Props }) {
  const [fases, setFases] = useState<FaseVM[]>(p.fases);
  const [periodos, setPeriodos] = useState(p.periodos); // cada barra é um período de uma fase
  const [drag, setDrag] = useState<{ id: string; faseId: string; modo: 'mover' | 'redim'; x0: number; s0: number; d0: number } | null>(null);
  const [sel, setSel] = useState(p.faseInicial);
  const [aberta, setAberta] = useState(''); // período com o painel aberto (linha expandida)
  const [farol, setFarol] = useState<Farol>(p.farol);
  const [aviso, setAviso] = useState('');
  const [pend, start] = useTransition();
  // reordenar (arrastar a fase para cima/baixo): guarda a ordem do começo do arraste
  const [vdrag, setVdrag] = useState<{ id: string; y0: number; ordem0: string[] } | null>(null);
  useEffect(() => { if (!drag && !vdrag) setFases(p.fases); }, [p.fases]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!drag) setPeriodos(p.periodos); }, [p.periodos]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const dims = [dimPrazo(dv, acimaIds.length), ...p.dimensoes];
  const sug = farolGeral(dims);
  const feitas = p.tarefas.filter((t) => t.concluida).length;

  function salvarOrdem(ids: string[]) {
    rodar(() => A.reordenarFases(p.id, ids));
  }
  function moverNaLista(id: string, delta: number) {
    const ids = fases.map((f) => f.id);
    const de = ids.indexOf(id);
    const nova = reordenar(fases, de, de + delta);
    if (nova.map((f) => f.id).join() === ids.join()) return;
    setFases(nova);
    salvarOrdem(nova.map((f) => f.id));
  }
  function onMove(e: React.PointerEvent) {
    if (vdrag) {
      const de = vdrag.ordem0.indexOf(vdrag.id);
      const para = de + Math.round((e.clientY - vdrag.y0) / ROW);
      const ordem = reordenar(vdrag.ordem0, de, para);
      setFases((fs) => ordem.map((id) => fs.find((f) => f.id === id)!).filter(Boolean));
      return;
    }
    if (!drag) return;
    const dw = Math.round((e.clientX - drag.x0) / W);
    const novos = periodos.map((x) => {
      if (x.id !== drag.id) return x;
      if (drag.modo === 'mover') { const ns = Math.max(0, drag.s0 + dw); if (ns !== x.inicioSemana) moveu.current = true; return { ...x, inicioSemana: ns }; }
      const nd = Math.max(1, drag.d0 + dw); if (nd !== x.duracao) moveu.current = true; return { ...x, duracao: nd };
    });
    setPeriodos(novos);
    // a fase acompanha ao vivo (do início do 1º ao fim do último período): desvio e fim previsto mudam enquanto arrasta
    const env = envelopeDosPeriodos(novos.filter((x) => x.faseId === drag.faseId));
    if (env) setFases((fs) => fs.map((f) => (f.id === drag.faseId ? { ...f, ...env } : f)));
  }
  function onUp(e?: React.PointerEvent) {
    if (vdrag) {
      const ids = fases.map((f) => f.id);
      setVdrag(null);
      if (ids.join() !== vdrag.ordem0.join()) salvarOrdem(ids);
      return;
    }
    if (!drag) return;
    const per = periodos.find((x) => x.id === drag.id);
    setDrag(null);
    if (per && moveu.current) rodar(() => A.moverPeriodo(per.id, per.inicioSemana, per.duracao));
    else if (per && e?.type === 'pointerup') { setAberta(aberta === per.id ? '' : per.id); setSel(per.faseId); } // clique sem arrastar: abre o painel do período
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
          <span style={s('font-size: 12px; color: #4A4458; max-width: 520px; text-align: right')}>Sugerido pelo TARS: <strong>{FAROL[sug.farol].rotulo}</strong> · {sug.porque}</span>
          <div role="list" aria-label="Farol por dimensão" style={s('display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end')}>
            {dims.map((x) => (
              <span key={x.chave} role="listitem" title={x.porque} aria-label={`${x.nome}: ${FAROL[x.farol].rotulo} · ${x.porque}`}
                style={{ ...s('display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: FAROL[x.farol].bg, color: FAROL[x.farol].fg }}>
                <span style={{ ...s('width: 7px; height: 7px; border-radius: 50%'), background: FAROL[x.farol].fg }} />{x.nome}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px')}>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Início</span><span style={s('font-size: 20px; font-weight: 700')}>{p.inicioLabel}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Fim previsto</span><span style={s('font-size: 20px; font-weight: 700')}>{br(dataSemana(fim))}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Desvio da linha de base</span><span style={{ ...s('font-size: 20px; font-weight: 700'), color: dv === null ? '#5E5770' : dv > 2 ? '#B42318' : dv > 0 ? '#9A5B05' : '#17723D' }}>{rotuloDesvioCurto(dv)}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Tarefas concluídas</span><span style={s('font-size: 20px; font-weight: 700')}>{feitas} de {p.tarefas.length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Acima do cedido</span><span style={{ ...s('font-size: 20px; font-weight: 700'), color: acimaIds.length ? '#9A5B05' : '#26213A' }}>{acimaIds.length} {acimaIds.length === 1 ? 'pessoa' : 'pessoas'}</span></div>
      </div>

      <section id="linha-do-tempo" aria-label="Linha do tempo" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center')}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Linha do tempo</h2><span style={s('font-size: 12px; color: #5E5770')}>{p.base ? 'Linha de base congelada. Mudanças agora geram desvio.' : 'Gerada a partir do modelo e das datas da iniciativa. Arraste as barras e congele a linha de base.'} Clique numa barra para atribuir pessoas e configurar a fase. Use ⠿ ou as setas para reordenar.</span></div>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.recriarDoModelo(p.id))} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Recriar a partir do modelo</button>
            <button type="button" disabled={pend} onClick={() => rodar(() => A.congelarLinhaBase(p.id), true)} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>{p.base ? 'Atualizar linha de base' : 'Congelar linha de base'}</button>
          </div>
        </div>
        <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
          <div onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} style={{ ...s('user-select: none'), minWidth: COL + semanas * W }}>
            <div style={s('display: flex; border-bottom: 1px solid #EFEBE3; background: #FAF8F4')}>
              <div style={{ ...s('padding: 8px 12px; font-size: 12px; color: #5E5770; font-weight: 600'), flex: `0 0 ${COL}px` }}>Fase · clique para detalhar</div>
              <div style={{ display: 'flex', flex: `0 0 ${semanas * W}px` }}>
                {meses.map(([r, n], i) => <div key={i} style={{ ...s('padding: 8px; box-sizing: border-box; font-size: 12px; font-weight: 600; color: #4A4458; border-left: 1px solid #EFEBE3; white-space: nowrap; overflow: hidden'), flex: `0 0 ${n * W}px` }}>{r}</div>)}
              </div>
            </div>
            {fases.map((f, idx) => {
              const st = statusFase(f);
              const subindo = vdrag?.id === f.id;
              const base = p.base?.find((b) => b.id === f.id);
              const on = sel === f.id;
              const doFase = ordenarPeriodos(periodos.filter((x) => x.faseId === f.id));
              const equipeDe = (perId: string) => siglaEquipe(p.alocs.filter((a) => a.periodoId === perId).map((a) => ({ nome: p.pessoas.find((x) => x.id === a.pessoaId)?.nome ?? '', pct: a.pct })));
              const perAberto = doFase.find((x) => x.id === aberta);
              const fimFase = doFase.reduce((m, x) => Math.max(m, x.inicioSemana + x.duracao), 0);
              return (
                <div key={f.id}>
                <div style={{ ...s('display: flex; border-bottom: 1px solid #F3F0EA'), background: subindo ? '#EFEAFE' : on ? '#F6F3FF' : '#FFFFFF', boxShadow: subindo ? '0 2px 10px rgba(38, 33, 58, 0.15)' : 'none', position: 'relative', zIndex: subindo ? 1 : 0 }}>
                  <div style={{ ...s('padding: 6px 4px 6px 6px; display: flex; align-items: center; gap: 4px; box-sizing: border-box'), flex: `0 0 ${COL}px` }}>
                    <span role="img" aria-label={`Arrastar ${f.nome} para cima ou para baixo`} title="Arraste para reordenar"
                      onPointerDown={(e) => { e.preventDefault(); setVdrag({ id: f.id, y0: e.clientY, ordem0: fases.map((x) => x.id) }); }}
                      style={{ ...s('width: 20px; height: 32px; display: flex; align-items: center; justify-content: center; color: #8A8296; font-size: 14px; touch-action: none; flex: 0 0 20px'), cursor: subindo ? 'grabbing' : 'grab' }}>⠿</span>
                    <button type="button" aria-pressed={on} aria-expanded={periodos.some((x) => x.id === aberta && x.faseId === f.id)} onClick={() => { const pf = ordenarPeriodos(periodos.filter((x) => x.faseId === f.id))[0]?.id ?? ''; const aqui = periodos.some((x) => x.id === aberta && x.faseId === f.id); setSel(on && aqui ? '' : f.id); setAberta(aqui ? '' : pf); }} style={s('flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; border: 0; background: transparent; padding: 4px 0; text-align: left; color: #26213A')}>
                      <span style={s('font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px')}>{f.nome}</span>
                      <span style={{ fontSize: 11, color: st === 'Em andamento' ? '#4B2FD1' : '#6E6780' }}>{st}{f.confirmada ? ' · confirmada' : ''}</span>
                    </button>
                    <button type="button" aria-label={`Subir fase ${f.nome}`} disabled={pend || idx === 0} onClick={() => moverNaLista(f.id, -1)} style={{ ...s('width: 24px; height: 32px; border-radius: 6px; border: 0; background: transparent; font-size: 12px; padding: 0'), color: idx === 0 ? '#D6CFC2' : '#6E6780' }}>↑</button>
                    <button type="button" aria-label={`Descer fase ${f.nome}`} disabled={pend || idx === fases.length - 1} onClick={() => moverNaLista(f.id, 1)} style={{ ...s('width: 24px; height: 32px; border-radius: 6px; border: 0; background: transparent; font-size: 12px; padding: 0'), color: idx === fases.length - 1 ? '#D6CFC2' : '#6E6780' }}>↓</button>
                    <button type="button" aria-label={`Remover fase ${f.nome}`} onClick={() => { if (confirm(`Remover a fase "${f.nome}"? As tarefas, alocações, marcos e riscos dela também serão apagados.`)) rodar(() => A.removerFase(f.id)); }} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>
                  </div>
                  <div style={{ ...s('position: relative; height: 52px'), flex: `0 0 ${semanas * W}px`, backgroundImage: 'linear-gradient(to right, #F3F0EA 1px, transparent 1px)', backgroundSize: `${W}px 52px` }}>
                    <div style={{ ...s('position: absolute; top: 0; bottom: 0; width: 2px; background: #B42318; opacity: 0.6'), left: p.semanaHoje * W }} />
                    {base && <div style={{ ...s('position: absolute; top: 40px; height: 4px; border-radius: 2px; background: #B8AFA0'), left: base.inicioSemana * W + 2, width: base.duracao * W - 4 }} />}
                    {doFase.map((per, k) => {
                      const nome = doFase.length > 1 ? `${f.nome} (${rotuloPeriodo(k, doFase.length)})` : f.nome;
                      const equipe = equipeDe(per.id);
                      const arrastando = drag?.id === per.id;
                      const ativo = aberta === per.id;
                      return (
                        <div key={per.id} role="button" tabIndex={0} aria-expanded={ativo} aria-label={`Barra da fase ${nome}: clique para atribuir pessoas e configurar`} title={equipe ? `${nome} · ${equipe}` : `${nome} · clique para atribuir pessoas`}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAberta(ativo ? '' : per.id); setSel(f.id); } }}
                          onPointerDown={(e) => { e.preventDefault(); moveu.current = false; setDrag({ id: per.id, faseId: f.id, modo: 'mover', x0: e.clientX, s0: per.inicioSemana, d0: per.duracao }); }}
                          style={{ ...s('position: absolute; top: 9px; height: 26px; border-radius: 7px; color: #FFFFFF; display: flex; align-items: center; padding-left: 8px; box-sizing: border-box; touch-action: none'), left: per.inicioSemana * W + 2, width: per.duracao * W - 4, background: st === 'Concluída' ? '#9C8CF0' : '#6D4AFF', cursor: arrastando ? 'grabbing' : 'grab', boxShadow: arrastando || ativo ? '0 0 0 3px #CFC4FF' : 'none' }}>
                          <span style={s('font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1')}>{doFase.length > 1 ? `${k + 1}º · ` : ''}{per.duracao} {per.duracao === 1 ? 'semana' : 'semanas'} · {br(dataSemana(per.inicioSemana)).slice(0, 5)}{equipe ? ` · ${equipe}` : ''}</span>
                          <span aria-hidden="true" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); moveu.current = false; setDrag({ id: per.id, faseId: f.id, modo: 'redim', x0: e.clientX, s0: per.inicioSemana, d0: per.duracao }); }} style={s('width: 10px; align-self: stretch; cursor: ew-resize; display: flex; align-items: center; justify-content: center')}><span style={s('width: 2px; height: 14px; border-radius: 1px; background: rgba(255,255,255,0.7)')} /></span>
                        </div>
                      );
                    })}
                    <button type="button" aria-label={`Adicionar outro período em ${f.nome}`} title="Adicionar outro período desta fase (outro momento, com equipe própria)" disabled={pend}
                      onPointerDown={(e) => e.stopPropagation()} onClick={() => rodar(() => A.adicionarPeriodo(f.id), true)}
                      style={{ ...s('position: absolute; top: 12px; width: 20px; height: 20px; border-radius: 50%; border: 1px dashed #BDB2F5; background: #FBFAFF; color: #4B2FD1; font-size: 13px; font-weight: 700; line-height: 1; padding: 0; display: flex; align-items: center; justify-content: center'), left: fimFase * W + 6 }}>+</button>
                  </div>
                </div>
                {perAberto && (
                  <div style={{ position: 'sticky', left: 0, width: 980, maxWidth: 'calc(100vw - 96px)', background: '#F6F3FF', borderBottom: '1px solid #F3F0EA', userSelect: 'text' }} onPointerDown={(e) => e.stopPropagation()}>
                    <PainelFase key={perAberto.id} fase={f} periodo={{ id: perAberto.id, rotulo: rotuloPeriodo(doFase.indexOf(perAberto), doFase.length), total: doFase.length }}
                      datas={`${br(dataSemana(perAberto.inicioSemana)).slice(0, 5)} a ${br(dataSemana(perAberto.inicioSemana + perAberto.duracao)).slice(0, 5)} (${perAberto.duracao} ${perAberto.duracao === 1 ? 'semana' : 'semanas'})`}
                      criterio={f.criterio} pessoas={p.pessoas} alocs={p.alocs.filter((a) => a.periodoId === perAberto.id).map((a) => ({ pessoaId: a.pessoaId, pct: a.pct }))}
                      marcos={p.marcos.filter((m) => m.faseId === f.id)} responsavelId={f.responsavelId} gpNome={p.pessoas.find((x) => x.id === p.gpId)?.nome ?? ''}
                      aoFechar={(msg) => { setAberta(''); if (msg) setAviso(msg); }} />
                  </div>
                )}
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
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Detalhamento por fase</h2><span style={s('font-size: 12px; color: #5E5770')}>Em "Todas as fases": quem atua em cada fase e período (o que está nas barras da linha do tempo). Escolha uma fase para cadastrar tarefas e registrar marcos e riscos.</span></div>
        <div role="tablist" aria-label="Fase" style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
          <button type="button" role="tab" aria-selected={!atual} onClick={() => setSel('')} style={tabEstilo(!atual)}>Todas as fases</button>
          {fases.map((f) => <button key={f.id} type="button" role="tab" aria-selected={sel === f.id} onClick={() => setSel(f.id)} style={tabEstilo(sel === f.id)}>{f.nome}</button>)}
        </div>
        {!atual ? <Grupos p={p} fases={fases} statusFase={statusFase} setSel={setSel} abrirPainel={(id) => { setAberta(id); setSel(p.periodos.find((x) => x.id === id)?.faseId ?? ''); document.getElementById('linha-do-tempo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} /> : <DetalheFase key={atual.id} p={p} f={atual} status={statusFase(atual)} datas={datasDe(atual)} rodar={rodar} pend={pend} />}
      </section>

      <StatusProjeto p={p} rodar={rodar} pend={pend} />
    </>
  );
}

type Rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>, mostrar?: boolean) => void;

function LinhaTarefa({ p, t, comRemover, rodar }: { p: Props; t: Props['tarefas'][number]; comRemover: boolean; rodar: Rodar }) {
  const atrasada = !t.concluida && !!t.prazo && t.prazo < p.hoje;
  const quem = p.pessoas.find((x) => x.id === t.responsavelId);
  const [ed, setEd] = useState<{ titulo: string; quem: string; prazo: string } | null>(null);
  const Tag = comRemover ? 'div' : 'label';
  if (ed) {
    const opcoes = p.pessoas.filter((x) => x.noProjeto || x.id === t.responsavelId);
    return (
      <div role="group" aria-label={`Editar tarefa ${t.titulo}`} style={s('display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; padding: 10px; border-radius: 9px; border: 1px solid #D9CFFF; background: #F7F4FF')}>
        <label style={{ ...sMiniLab, flex: '2 1 200px' }}>Tarefa<input type="text" value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} style={sMini} /></label>
        <label style={{ ...sMiniLab, flex: '1 1 150px' }}>Responsável<select value={ed.quem} onChange={(e) => setEd({ ...ed, quem: e.target.value })} style={sMini}>
          <option value="">Sem responsável (conta para o GP)</option>
          {(opcoes.length ? opcoes : p.pessoas).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select></label>
        <label style={{ ...sMiniLab, flex: '1 1 140px' }}>Prazo<input type="date" value={ed.prazo} onChange={(e) => setEd({ ...ed, prazo: e.target.value })} style={sMini} /></label>
        <button type="button" onClick={() => setEd(null)} style={s('height: 40px; padding: 0 12px; border-radius: 9px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Cancelar</button>
        <button type="button" disabled={!ed.titulo.trim()} onClick={() => { rodar(() => A.editarTarefa(t.id, { titulo: ed.titulo, responsavelId: ed.quem, prazo: ed.prazo }), true); setEd(null); }} style={sAdd}>Salvar</button>
      </div>
    );
  }
  return (
    <Tag style={comRemover ? s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; border: 1px solid #EFEBE3') : s('display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; background: #FAF8F4; cursor: pointer')}>
      <input type="checkbox" checked={t.concluida} aria-label={`Concluir ${t.titulo}`} onChange={() => rodar(() => A.alternarTarefa(t.id))} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />
      <span style={{ ...s('flex: 1 1 200px; font-size: 13px; font-weight: 600'), color: t.concluida ? '#8A8296' : '#26213A', textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</span>
      <span style={s('font-size: 12px; color: #5E5770')}>{quem?.nome ?? ''}</span>
      <span style={{ fontSize: 12, fontWeight: atrasada ? 700 : 400, color: atrasada ? '#B42318' : '#5E5770' }}>{t.prazo ? (atrasada ? `Atrasada · ${br(t.prazo)}` : `Prazo ${br(t.prazo)}`) : 'Sem prazo'}</span>
      {comRemover && <button type="button" aria-label={`Editar tarefa ${t.titulo}`} title="Editar título, responsável e prazo" onClick={() => setEd({ titulo: t.titulo, quem: t.responsavelId ?? '', prazo: t.prazo ?? '' })} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #6E6780; font-size: 15px')}>✎</button>}
      {comRemover && <button type="button" aria-label={`Remover tarefa ${t.titulo}`} onClick={() => rodar(() => A.removerTarefa(t.id))} style={s('width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: #8A8296; font-size: 16px')}>×</button>}
    </Tag>
  );
}

/** "Todas as fases": detalhamento dos recursos atribuídos em cada fase e período (o que está nas barras da linha do tempo). */
function Grupos({ p, fases, statusFase, setSel, abrirPainel }: { p: Props; fases: FaseVM[]; statusFase: (f: Fase) => string; setSel: (id: string) => void; abrirPainel: (periodoId: string) => void }) {
  const th = s('text-align: left; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #5E5770; background: #FAF8F4; border-bottom: 1px solid #EFEBE3; white-space: nowrap');
  const td = s('padding: 9px 12px; border-bottom: 1px solid #F3F0EA; vertical-align: top; font-size: 13px');
  const data = (w: number) => br(addDias(p.inicio, w * 7)).slice(0, 5);
  return (
    <div style={s('overflow-x: auto; border: 1px solid #EFEBE3; border-radius: 12px')}>
      <table aria-label="Recursos por fase e período" style={s('width: 100%; border-collapse: collapse; min-width: 760px')}>
        <thead><tr>{['Fase', 'Período', 'Quem atua (%)', 'Carga', 'Tarefas', ''].map((c, i) => <th key={i} scope="col" style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {fases.flatMap((f) => {
            const pers = ordenarPeriodos(p.periodos.filter((x) => x.faseId === f.id));
            const tks = p.tarefas.filter((t) => t.faseId === f.id);
            const feitas = tks.filter((t) => t.concluida).length;
            const atrasadas = tks.filter((t) => !t.concluida && t.prazo && t.prazo < p.hoje).length;
            return pers.map((per, k) => {
              const ppl = p.alocs.filter((a) => a.periodoId === per.id);
              const carga = ppl.reduce((soma, a) => soma + a.pct, 0) / 100;
              const rotulo = rotuloPeriodo(k, pers.length) || 'Único';
              return (
                <tr key={per.id}>
                  {k === 0 && (
                    <th scope="row" rowSpan={pers.length} style={{ ...td, textAlign: 'left' }}>
                      <button type="button" onClick={() => setSel(f.id)} style={s('display: flex; flex-direction: column; align-items: flex-start; border: 0; background: transparent; padding: 0; text-align: left; color: #26213A')}>
                        <span style={s('font-size: 13px; font-weight: 700')}>{f.nome}</span><span style={s('font-size: 11px; color: #5E5770; font-weight: 400')}>{statusFase(f)}</span>
                      </button>
                    </th>
                  )}
                  <td style={td}><span style={s('font-weight: 600')}>{rotulo}</span><br /><span style={s('font-size: 12px; color: #5E5770')}>{data(per.inicioSemana)} a {data(per.inicioSemana + per.duracao)} · {per.duracao} sem.</span></td>
                  <td style={td}>
                    <span style={s('display: flex; flex-wrap: wrap; gap: 4px')}>
                      {ppl.map((a) => {
                        const pe = p.pessoas.find((x) => x.id === a.pessoaId);
                        const over = pe && pe.cap != null && a.pct > pe.cap;
                        return <span key={a.pessoaId} title={over ? `Acima do cedido (${pe?.cap}%): pedido ao gestor` : undefined} style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: over ? '#FEF3DC' : '#EFEAFE', color: over ? '#7A4A04' : '#3A22A8' }}>{pe?.nome ?? ''} {a.pct}%</span>;
                      })}
                      {ppl.length === 0 && <span style={s('font-size: 12px; color: #9A5B05; font-weight: 600')}>Ninguém atribuído</span>}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{carga ? `${carga.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${carga <= 1 ? 'pessoa' : 'pessoas'}` : '—'}</td>
                  {k === 0 && <td rowSpan={pers.length} style={{ ...td, whiteSpace: 'nowrap' }}>{tks.length ? `${feitas} de ${tks.length}` : '—'}{atrasadas ? <><br /><span style={s('font-size: 12px; color: #B42318; font-weight: 600')}>{atrasadas} atrasada(s)</span></> : null}</td>}
                  <td style={td}><button type="button" aria-label={`Editar recursos de ${f.nome}${pers.length > 1 ? ` (${rotulo})` : ''}`} onClick={() => abrirPainel(per.id)} style={s('border: 0; background: transparent; color: #4B2FD1; font-weight: 600; font-size: 13px; white-space: nowrap')}>Editar →</button></td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
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
        <span style={s('font-size: 12px; color: #5E5770')}>Para atribuir pessoas ou mudar o %, clique na barra do período na linha do tempo.</span>
        {ordenarPeriodos(p.periodos.filter((x) => x.faseId === f.id)).map((per, k, todos) => {
          const doPer = p.alocs.filter((a) => a.periodoId === per.id);
          return (
            <div key={per.id} role="group" aria-label={`Pessoas de ${f.nome}${todos.length > 1 ? ` (${rotuloPeriodo(k, todos.length)})` : ''}`} style={s('display: flex; flex-direction: column; gap: 6px')}>
              {todos.length > 1 && <span style={s('font-size: 12px; font-weight: 700; color: #4B2FD1')}>{rotuloPeriodo(k, todos.length)} · {br(addDias(p.inicio, per.inicioSemana * 7)).slice(0, 5)} a {br(addDias(p.inicio, (per.inicioSemana + per.duracao) * 7)).slice(0, 5)}</span>}
              {doPer.map((a) => {
                const pe = p.pessoas.find((x) => x.id === a.pessoaId);
                if (!pe) return null;
                const ext = pe.cap === null, over = !ext && a.pct > (pe.cap ?? 0);
                return (
                  <div key={a.pessoaId} style={s('display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 10px; border: 1px solid #EFEBE3')}>
                    <span style={s('width: 28px; height: 28px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex: 0 0 28px')}>{pe.ini}</span>
                    <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 13px; font-weight: 600')}>{pe.nome} · {a.pct}%</span><span style={{ fontSize: 11, color: over ? '#9A5B05' : '#5E5770', fontWeight: over ? 600 : 400 }}>{ext ? 'Externo: sem limite de cedência' : over ? `Acima do cedido (${pe.cap}%): pedido de aprovação enviado ao gestor da área` : `Dentro do cedido pelo gestor (${pe.cap ?? 0}%)`}</span></span>
                  </div>
                );
              })}
              {doPer.length === 0 && <span style={s('font-size: 12px; color: #5E5770')}>Ninguém atribuído.</span>}
            </div>
          );
        })}

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

        <RiscosFase faseId={f.id} riscos={p.riscos} equipe={equipe.map((x) => ({ id: x.id, nome: x.nome }))} rodar={rodar} pend={pend} />
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
