'use client';

import { useEffect, useState, useTransition } from 'react';
import { s } from '@/lib/css';
import { FAROL, type Farol } from '@/lib/regras/projeto';
import { aprovarComoGestor, definirCedencia, devolverParaAjuste, responderPedido } from '@/app/acoes/gestor';

type Aprovacao = { id: string; titulo: string; quem: string; quando: string; problema: string; tipo: string; urg: string; urgente: boolean; custo: string };
type Linha = { id: string; nome: string; tipo: string; etapa: string; info: string; farol: string | null };
type Membro = { id: string; nome: string; ini: string; papel: string; cap: number; aloc: number; alocado: string };
type Pedido = { id: string; texto: string; delta: number };

export function VisaoArea(p: { trilha: string; nome: string; escopo: string; aprovacoes: Aprovacao[]; linhas: Linha[]; time: Membro[]; pedidos: Pedido[]; emExecucao: number }) {
  const [toast, setToast] = useState('');
  const [devolvendo, setDevolvendo] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [caps, setCaps] = useState<Record<string, number>>(() => Object.fromEntries(p.time.map((m) => [m.id, m.cap])));
  const [pend, start] = useTransition();
  useEffect(() => setCaps(Object.fromEntries(p.time.map((m) => [m.id, m.cap]))), [p.time]);

  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>) => start(async () => {
    const r = await fn();
    setToast(r.ok ? r.msg ?? '' : r.erro ?? '');
    setDevolvendo(null); setNota('');
  });

  const acima = p.time.filter((m) => m.aloc > (caps[m.id] ?? m.cap)).length;
  const sKpi = s('background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px');

  return (
    <>
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>{p.trilha}</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Olá, {p.nome.split(' ')[0]}</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Iniciativas, projetos e pessoas da sua área em um só lugar.</p>
        </div>
        <span style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px; display: inline-flex; align-items: center')}>{p.escopo}</span>
      </div>

      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px')}>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Aguardando sua decisão</span><span style={s('font-size: 26px; font-weight: 700; color: #4B2FD1')}>{p.aprovacoes.length + p.pedidos.length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Iniciativas e projetos da área</span><span style={s('font-size: 26px; font-weight: 700')}>{p.linhas.length}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Projetos em execução</span><span style={s('font-size: 26px; font-weight: 700')}>{p.emExecucao}</span></div>
        <div style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Pessoas acima do cedido</span><span style={{ ...s('font-size: 26px; font-weight: 700'), color: acima > 0 ? '#9A5B05' : '#26213A' }}>{acima}</span></div>
      </div>

      {toast && <div role="status" style={s('padding: 12px 16px; border-radius: 12px; background: #EFEAFE; color: #3A22A8; font-size: 13px; font-weight: 600')}>{toast}</div>}

      <section id="aprovacoes" aria-label="Aprovações pendentes" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Iniciativas aguardando sua aprovação</h2><span style={s('font-size: 12px; color: #5E5770')}>Ao aprovar, a iniciativa segue para avaliação do PMO no fechamento do ciclo.</span></div>
        {p.aprovacoes.map((a) => {
          const ret = devolvendo === a.id;
          return (
            <div key={a.id} style={s('border: 1px solid #EFEBE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px')}>
              <div style={s('display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start')}>
                <div style={s('display: flex; flex-direction: column; gap: 4px; flex: 1 1 280px; min-width: 0')}>
                  <span style={s('font-size: 15px; font-weight: 600')}>{a.titulo}</span>
                  <span style={s('font-size: 12px; color: #5E5770')}>{a.quem} · enviada {a.quando}</span>
                  <span style={s('font-size: 13px; color: #4A4458; line-height: 1.5')}>{a.problema}</span>
                </div>
                <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
                  <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EFEAFE; color: #4B2FD1')}>{a.tipo}</span>
                  <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: a.urgente ? '#FEF3DC' : '#EDEAE3', color: a.urgente ? '#7A4A04' : '#4A4458' }}>{a.urg}</span>
                  <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>{a.custo}</span>
                </div>
              </div>
              {ret && (
                <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>O que precisa ser ajustado?
                  <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalhe o custo estimado e quem mais é impactado." style={s('padding: 10px 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; font-weight: 400; color: #26213A; resize: vertical')} />
                </label>
              )}
              <div style={s('display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px')}>
                {!ret ? (
                  <>
                    <button type="button" disabled={pend} onClick={() => { setDevolvendo(a.id); setNota(''); }} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Devolver para ajuste</button>
                    <button type="button" disabled={pend} onClick={() => rodar(() => aprovarComoGestor(a.id))} style={s('height: 38px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Aprovar e enviar ao PMO</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={pend} onClick={() => setDevolvendo(null)} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Voltar</button>
                    <button type="button" disabled={pend} onClick={() => rodar(() => devolverParaAjuste(a.id, nota))} style={s('height: 38px; padding: 0 16px; border-radius: 10px; border: 0; background: #26213A; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Devolver ao solicitante</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {p.aprovacoes.length === 0 && <div style={s('border: 1px dashed #D6CFC2; border-radius: 12px; padding: 18px; font-size: 13px; color: #5E5770; text-align: center')}>Tudo em dia. Nenhuma iniciativa aguardando você.</div>}
      </section>

      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <section aria-label="Iniciativas e projetos da área" style={s('flex: 999 1 520px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
          <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Iniciativas e projetos da área</h2>
          <div style={s('overflow-x: auto')}>
            <div style={s('min-width: 560px; display: flex; flex-direction: column')}>
              <div style={s('display: grid; grid-template-columns: 2.2fr 1.1fr 1.6fr 0.8fr; gap: 10px; padding: 8px 4px; font-size: 12px; color: #5E5770; font-weight: 600; border-bottom: 1px solid #EFEBE3')}><span>Nome</span><span>Etapa</span><span>Situação / GP</span><span>Farol</span></div>
              {p.linhas.map((r) => {
                const f = r.farol ? FAROL[r.farol as Farol] : null;
                return (
                  <div key={r.id} style={s('display: grid; grid-template-columns: 2.2fr 1.1fr 1.6fr 0.8fr; gap: 10px; padding: 12px 4px; font-size: 13px; border-bottom: 1px solid #F3F0EA; align-items: center')}>
                    <span style={s('display: flex; flex-direction: column')}><span style={s('font-weight: 600')}>{r.nome}</span><span style={s('font-size: 11px; color: #5E5770')}>{r.tipo}</span></span>
                    <span>{r.etapa}</span>
                    <span style={s('color: #4A4458')}>{r.info}</span>
                    {f ? <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; justify-self: start'), background: f.bg, color: f.fg }}>{f.rotulo}</span> : <span style={s('font-size: 12px; color: #8A8296')}>—</span>}
                  </div>
                );
              })}
              {p.linhas.length === 0 && <span style={s('font-size: 13px; color: #5E5770; padding: 12px 4px')}>Nenhuma iniciativa ou projeto da área ainda.</span>}
            </div>
          </div>
        </section>

        <section id="capacidade" aria-label="Capacidade do time" style={s('flex: 1 1 420px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Quanto o time pode ceder</h2><span style={s('font-size: 12px; color: #5E5770')}>Você conhece a operação: defina o máximo de cada pessoa para projetos.</span></div>
          {p.pedidos.map((x) => (
            <div key={x.id} style={s('padding: 12px; border-radius: 12px; background: #FEF3DC; display: flex; flex-direction: column; gap: 8px')}>
              <span style={s('font-size: 13px; font-weight: 600; color: #6B3F03')}>Pedido de alocação</span>
              <span style={s('font-size: 13px; color: #4A3205')}>{x.texto}</span>
              <div style={s('display: flex; gap: 8px; justify-content: flex-end')}>
                <button type="button" disabled={pend} onClick={() => rodar(() => responderPedido(x.id, false))} style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 1px solid #E8CF9C; background: #FFFFFF; color: #4A3205; font-size: 12px')}>Recusar</button>
                <button type="button" disabled={pend} onClick={() => rodar(() => responderPedido(x.id, true))} style={s('height: 34px; padding: 0 12px; border-radius: 9px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 12px')}>Ceder +{x.delta}%</button>
              </div>
            </div>
          ))}
          {p.time.map((m) => {
            const cap = caps[m.id] ?? m.cap;
            const o = m.aloc > cap;
            return (
              <div key={m.id} style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid #EFEBE3')}>
                <div style={s('display: flex; align-items: center; gap: 10px')}>
                  <span style={s('width: 30px; height: 30px; border-radius: 50%; background: #E7E0FF; color: #4B2FD1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600')}>{m.ini}</span>
                  <span style={s('display: flex; flex-direction: column; flex: 1; min-width: 0')}><span style={s('font-size: 14px; font-weight: 600')}>{m.nome}</span><span style={s('font-size: 12px; color: #5E5770')}>{m.papel}</span></span>
                  <span style={s('font-size: 13px; font-weight: 700')}>{cap}%</span>
                </div>
                <label style={s('display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #5E5770')}>Pode ceder para projetos
                  <input type="range" min={0} max={100} step={10} value={cap} aria-label={`Capacidade cedida de ${m.nome}`}
                    onChange={(e) => setCaps({ ...caps, [m.id]: Number(e.target.value) })}
                    onPointerUp={(e) => { const v = Number((e.target as HTMLInputElement).value); start(async () => { await definirCedencia(m.id, v); }); }}
                    onKeyUp={(e) => { const v = Number((e.target as HTMLInputElement).value); start(async () => { await definirCedencia(m.id, v); }); }} />
                </label>
                <div style={s('height: 8px; border-radius: 4px; background: #EFEBE3; position: relative; overflow: hidden')}>
                  <div style={{ ...s('position: absolute; left: 0; top: 0; bottom: 0; background: #DCD2FF'), width: `${cap}%` }} />
                  <div style={{ ...s('position: absolute; left: 0; top: 2px; bottom: 2px; border-radius: 3px'), width: `${Math.min(100, m.aloc)}%`, background: o ? '#C27A0A' : '#6D4AFF' }} />
                </div>
                <span style={{ fontSize: 12, color: o ? '#9A5B05' : '#5E5770', fontWeight: o ? 600 : 400 }}>
                  {o ? `${m.alocado} em ${m.aloc}%, acima do que você cedeu. Ajuste o limite ou converse com o GP.` : `${m.alocado} em ${m.aloc}% de ${cap}% disponíveis.`}
                </span>
              </div>
            );
          })}
          {p.time.length === 0 && <span style={s('font-size: 13px; color: #5E5770')}>Ninguém no seu time ainda.</span>}
        </section>
      </div>
    </>
  );
}
