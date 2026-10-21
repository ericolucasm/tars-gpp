'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import type { Acao, AcoesCard } from '@/lib/regras/esteira';
import { FAROL, type Farol } from '@/lib/regras/projeto';
import { moverCard, salvarProgressoGate } from '@/app/acoes/esteira';
import { sInput, sLabel } from '@/components/ui';

export type CardVM = {
  id: string; raiaId: string; areaId: string; titulo: string; kind: string; area: string;
  tag: { tipo: 'farol'; farol: string } | { tipo: 'roxo' | 'neutro'; rotulo: string };
  situacao: string; sub: string; progresso: number | null; dono: string; link: string | null;
  solAguardandoGestor: boolean; farolCritico: boolean; acoes: AcoesCard; progressoGates: Record<string, boolean[]>;
};
export type RaiaVM = { id: string; chave: string | null; nome: string; descricao: string; saida: boolean };

type Props = {
  raias: RaiaVM[]; cards: CardVM[]; cicloTexto: string | null; modoMisto: boolean;
  areas: { id: string; nome: string }[]; gps: { id: string; nome: string; gp: boolean }[]; modelos: { id: string; nome: string }[];
  motivos: { recusa: string[]; pausa: string[]; cancelamento: string[] }; hoje: string;
};

const TAG_BASE = 'display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; flex: 0 0 auto; ';

function Tag({ tag }: { tag: CardVM['tag'] }) {
  if (tag.tipo === 'farol') {
    const f = FAROL[tag.farol as Farol] ?? FAROL.ok;
    return <span style={{ ...s(TAG_BASE), background: f.bg, color: f.fg }}><span style={{ ...s('width: 7px; height: 7px; border-radius: 50%'), background: f.fg }} />{f.rotulo}</span>;
  }
  return <span style={s(TAG_BASE + (tag.tipo === 'roxo' ? 'background: #EFEAFE; color: #4B2FD1' : 'background: #EDEAE3; color: #4A4458'))}>{tag.rotulo}</span>;
}

type GateAberto = { card: CardVM; acao: Acao; marcados: boolean[] };

export function Quadro(p: Props) {
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [area, setArea] = useState('');
  const [gate, setGate] = useState<GateAberto | null>(null);

  const cards = useMemo(() => p.cards.filter((c) => !area || c.areaId === area), [p.cards, area]);
  const saida = p.raias.find((r) => r.saida);
  const visiveis = p.raias.filter((r) => !r.saida || mostrarCancelados);
  const conta = (pred: (c: CardVM) => boolean) => cards.filter(pred).length;
  const exe = p.raias.find((r) => r.chave === 'exe');
  const sol = p.raias.find((r) => r.chave === 'sol');

  function abrir(card: CardVM, acao: Acao) {
    const salvos = card.progressoGates[acao.gateKey] ?? [];
    setGate({ card, acao, marcados: acao.criterios.map((_, i) => !!salvos[i]) });
  }

  return (
    <>
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Gestão / Portfólio</span>
          <h1 style={s('margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.3px')}>Portfólio</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Da solicitação à entrega: cada iniciativa passa por etapas com critérios claros.</p>
          <div style={s('display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px')}>
            {p.cicloTexto && <span style={s('display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 10px; background: #E7E0FF; color: #4B2FD1')}><span style={s('width: 7px; height: 7px; border-radius: 50%; background: #4B2FD1')} />{p.cicloTexto}</span>}
            {p.modoMisto && <span style={s('font-size: 12px; padding: 4px 10px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>Modo misto: urgências e obrigatórias entram fora do ciclo</span>}
          </div>
        </div>
        <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
          <select aria-label="Filtrar por área" value={area} onChange={(e) => setArea(e.target.value)} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>
            <option value="">Todas as áreas</option>
            {p.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button type="button" onClick={() => setMostrarCancelados(!mostrarCancelados)} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>
            {mostrarCancelados ? 'Ocultar cancelados' : `Mostrar cancelados (${saida ? conta((c) => c.raiaId === saida.id) : 0})`}
          </button>
          <Link href="/iniciativas/nova" style={s('height: 40px; padding: 0 16px; border-radius: 10px; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center')}>Nova iniciativa</Link>
        </div>
      </div>

      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px')}>
        {[
          ['Em execução', exe ? conta((c) => c.raiaId === exe.id) : 0, undefined],
          ['Críticos', conta((c) => c.farolCritico), '#B42318'],
          ['Aguardando gestor', conta((c) => c.solAguardandoGestor), undefined],
          ['Aguardando avaliação do PMO', sol ? conta((c) => c.raiaId === sol.id && !c.solAguardandoGestor && c.situacao === 'Aguardando avaliação do PMO') : 0, undefined],
        ].map(([r, v, cor]) => (
          <div key={r as string} style={s('background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px')}>
            <span style={s('font-size: 12px; color: #5E5770')}>{r}</span><span style={{ ...s('font-size: 26px; font-weight: 700'), color: cor as string | undefined }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={s('position: relative')}>
        <div style={s('overflow-x: auto; padding-bottom: 8px')}>
          <div style={s('display: flex; gap: 14px; align-items: flex-start; min-width: min-content')}>
            {visiveis.map((raia) => {
              const lista = cards.filter((c) => c.raiaId === raia.id);
              return (
                <section key={raia.id} aria-label={raia.nome} style={s('flex: 0 0 272px; background: #F3F0EA; border-radius: 14px; padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px')}>
                  <div style={s('display: flex; flex-direction: column; gap: 2px; padding: 2px 4px 4px')}>
                    <div style={s('display: flex; align-items: center; gap: 8px')}><h2 style={s('margin: 0; font-size: 14px; font-weight: 700')}>{raia.nome}</h2><span style={s('font-size: 12px; padding: 1px 8px; border-radius: 9px; background: #FFFFFF; color: #4A4458')}>{lista.length}</span></div>
                    <span style={s('font-size: 12px; color: #5E5770')}>{raia.descricao}</span>
                  </div>
                  {lista.map((c) => <Cartao key={c.id} c={c} abrir={abrir} />)}
                  {lista.length === 0 && <div style={s('border: 1px dashed #D6CFC2; border-radius: 12px; padding: 16px; font-size: 12px; color: #5E5770; text-align: center')}>Nenhuma iniciativa aqui</div>}
                </section>
              );
            })}
          </div>
        </div>
        {gate && <ModalGate gate={gate} setGate={setGate} props={p} />}
      </div>

      <p style={s('margin: 0; font-size: 12px; color: #5E5770')}>Farol: Crítico, Atenção e OK aparecem só em projetos em execução ou pausados. Nas demais etapas, a etiqueta mostra prioridade ou prontidão.</p>
    </>
  );
}

function Cartao({ c, abrir }: { c: CardVM; abrir: (c: CardVM, a: Acao) => void }) {
  const { primaria, secundaria, cancelar } = c.acoes;
  return (
    <article style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px')}>
      <div style={s('display: flex; align-items: center; justify-content: space-between; gap: 8px')}>
        <span style={s('font-size: 11px; color: #5E5770; font-weight: 600; letter-spacing: 0.3px')}>{c.kind} · {c.area}</span>
        <Tag tag={c.tag} />
      </div>
      {c.link
        ? <Link href={c.link} style={s('font-size: 14px; font-weight: 600; line-height: 1.35; color: #4B2FD1; text-decoration: underline')}>{c.titulo}</Link>
        : <span style={s('font-size: 14px; font-weight: 600; line-height: 1.35')}>{c.titulo}</span>}
      {c.situacao && <span style={s('font-size: 12px; color: #26213A; display: flex; gap: 4px; flex-wrap: wrap')}><span style={s('color: #6E6780')}>Situação:</span>{c.situacao}</span>}
      <span style={s('font-size: 12px; color: #5E5770; line-height: 1.4')}>{c.sub}</span>
      {c.progresso !== null && (
        <div style={s('height: 6px; border-radius: 4px; background: #EFEBE3; overflow: hidden')}><div style={{ ...s('height: 6px; border-radius: 4px; background: #6D4AFF'), width: `${c.progresso}%` }} /></div>
      )}
      <div style={s('display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 2px')}>
        <span style={s('width: 26px; height: 26px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600')}>{c.dono}</span>
        <div style={s('flex: 1')} />
        {cancelar && <button type="button" onClick={() => abrir(c, cancelar)} style={s('height: 32px; padding: 0 10px; border-radius: 8px; border: 0; background: transparent; color: #5E5770; font-size: 12px')}>Cancelar</button>}
        {secundaria && <button type="button" onClick={() => abrir(c, secundaria)} style={s('height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 12px')}>{secundaria.rotulo}</button>}
        {primaria && (
          <button type="button" onClick={() => abrir(c, primaria)} style={s('height: 32px; padding: 0 12px; border-radius: 8px; border: 0; background: #6D4AFF; color: #FFFFFF; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px')}>
            {primaria.rotulo === 'Dar play' && <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>}
            {primaria.rotulo}
          </button>
        )}
      </div>
    </article>
  );
}

function ModalGate({ gate, setGate, props }: { gate: GateAberto; setGate: (g: GateAberto | null) => void; props: Props }) {
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const { acao, card } = gate;
  const ehPlay = acao.tipo === 'avancar' && acao.rotulo === 'Dar play';
  const precisaPlay = acao.tipo === 'avancar' && props.raias.find((r) => r.id === acao.paraRaiaId)?.chave === 'exe';
  const [gpId, setGpId] = useState(props.gps.find((g) => g.gp)?.id ?? '');
  const [modeloId, setModeloId] = useState(props.modelos[0]?.id ?? '');
  const [inicio, setInicio] = useState(props.hoje);
  const motivos = acao.tipo === 'pausar' ? props.motivos.pausa : acao.tipo === 'cancelar' ? (card.kind === 'PROJETO' ? props.motivos.cancelamento : [...props.motivos.recusa, ...props.motivos.cancelamento]) : [];
  const [motivo, setMotivo] = useState(motivos[0] ?? '');
  const [retomada, setRetomada] = useState('');

  function alternar(i: number) {
    const marcados = gate.marcados.map((m, j) => (j === i ? !m : m));
    setGate({ ...gate, marcados });
    setErro('');
    // guarda o progresso do checklist (alimenta a prontidão do pré-projeto)
    salvarProgressoGate(card.id, acao.gateKey, marcados).catch(() => {});
  }

  function confirmar() {
    const faltam = acao.criterios.filter((c, i) => c.obrigatorio && !gate.marcados[i]).length;
    if (faltam > 0) { setErro(faltam === 1 ? 'Falta 1 critério para avançar.' : `Faltam ${faltam} critérios para avançar.`); return; }
    start(async () => {
      const r = await moverCard({ iniciativaId: card.id, tipo: acao.tipo, paraRaiaId: acao.paraRaiaId, marcados: gate.marcados, extras: { gpId, modeloId, inicio, motivo, retomada } });
      if (!r.ok) setErro(r.erro); else setGate(null);
    });
  }

  return (
    <div style={s('position: absolute; inset: 0; min-height: 480px; background: rgba(38, 33, 58, 0.35); border-radius: 14px; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; box-sizing: border-box')}>
      <div role="dialog" aria-label={acao.titulo} style={s('width: 440px; max-width: 100%; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2DCD0; padding: 22px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #4B2FD1; font-weight: 600; letter-spacing: 0.3px')}>CRITÉRIOS DE PASSAGEM</span>
          <h2 style={s('margin: 0; font-size: 20px; font-weight: 700')}>{acao.titulo}</h2>
          <span style={s('font-size: 13px; color: #5E5770')}>{card.titulo}</span>
        </div>
        <p style={s('margin: 0; font-size: 13px; color: #4A4458; line-height: 1.5')}>{acao.dica}</p>
        <div style={s('display: flex; flex-direction: column; gap: 6px')}>
          {acao.criterios.map((c, i) => (
            <label key={i} style={s('display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid #E8E3D9; font-size: 14px; cursor: pointer')}>
              <input type="checkbox" checked={gate.marcados[i]} onChange={() => alternar(i)} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />
              <span style={s('flex: 1')}>{c.texto}</span>
              {!c.obrigatorio && <span style={s('font-size: 11px; color: #5E5770')}>opcional</span>}
            </label>
          ))}
          {acao.criterios.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Sem critérios: o card entra direto.</span>}
        </div>

        {(ehPlay || precisaPlay) && (
          <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; padding-top: 4px')}>
            <label style={sLabel}>Gerente de projeto
              <select value={gpId} onChange={(e) => setGpId(e.target.value)} style={sInput}>
                <option value="">Escolha…</option>
                {props.gps.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </label>
            <label style={sLabel}>Modelo de projeto
              <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} style={sInput}>
                {props.modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </label>
            <label style={sLabel}>Início<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={sInput} /></label>
          </div>
        )}
        {(acao.tipo === 'pausar' || acao.tipo === 'cancelar') && (
          <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px')}>
            <label style={sLabel}>Motivo
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={sInput}>
                {motivos.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            {acao.tipo === 'pausar' && <label style={sLabel}>Retomada prevista<input type="date" value={retomada} onChange={(e) => setRetomada(e.target.value)} style={sInput} /></label>}
          </div>
        )}

        {erro && <span style={s('font-size: 13px; color: #B42318')}>{erro}</span>}
        <div style={s('display: flex; justify-content: flex-end; gap: 8px')}>
          <button type="button" onClick={() => setGate(null)} style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Voltar</button>
          <button type="button" disabled={pend} onClick={confirmar} style={s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>{acao.confirmar}</button>
        </div>
      </div>
    </div>
  );
}
