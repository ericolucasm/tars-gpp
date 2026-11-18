'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { FAROL, type Farol } from '@/lib/regras/projeto';
import { DetalheIniciativa, TituloExpansivel, cliqueNaLinha } from '@/components/DetalheIniciativa';
import type { Detalhe } from '@/lib/detalhe';
import { aprovarComoGestor, definirCedencia, devolverParaAjuste, naoSeguirComoGestor, responderPedido } from '@/app/acoes/gestor';

type Aprovacao = { id: string; titulo: string; quem: string; quando: string; problema: string; tipo: string; urg: string; urgente: boolean; custo: string; det: Detalhe };
type Linha = { id: string; nome: string; tipo: string; chave: string; etapa: string; info: string; farol: string | null; det: Detalhe };
export type Aba = 'iniciativas' | 'projetos' | 'time';

const TEXTO: Record<Aba, string> = {
  iniciativas: 'Iniciativas da sua área esperando aprovação e as que já seguem no portfólio.',
  projetos: 'Projetos da sua área que estão rodando.',
  time: 'Quanto cada pessoa do time pode ceder e os pedidos de alocação.',
};
type Membro = { id: string; nome: string; ini: string; papel: string; cap: number; aloc: number; alocado: string };
type MesImp = { mes: string; carga: number; doProjeto: number; situacao: 'ok' | 'so_com_pedido' | 'acima' };
type Pedido = { id: string; texto: string; delta: number; quem: string; impacto: { limiteAtual: number; limiteNovo: number; comCronograma: boolean; meses: MesImp[] } };

export function VisaoArea(p: { aba: Aba; trilha: string; nome: string; escopo: string; aprovacoes: Aprovacao[]; linhas: Linha[]; time: Membro[]; pedidos: Pedido[]; motivos: string[]; emExecucao: number; rodando: number }) {
  const [toast, setToast] = useState('');
  const [devolvendo, setDevolvendo] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [caps, setCaps] = useState<Record<string, number>>(() => Object.fromEntries(p.time.map((m) => [m.id, m.cap])));
  const [pend, start] = useTransition();
  const [aberta, setAberta] = useState<string | null>(null);
  useEffect(() => setCaps(Object.fromEntries(p.time.map((m) => [m.id, m.cap]))), [p.time]);

  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>) => start(async () => {
    const r = await fn();
    setToast(r.ok ? r.msg ?? '' : r.erro ?? '');
    if (!r.ok) return;
    setDevolvendo(null); setRecusando(null); setNota(''); setMotivo('');
  });

  const acima = p.time.filter((m) => m.aloc > (caps[m.id] ?? m.cap)).length;
  const sKpi = s('background: #FFFFFF; border: 1px solid #E8E3D9; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; color: #26213A');
  const iniciativas = p.linhas.filter((l) => l.tipo !== 'Projeto');
  const projetos = p.linhas.filter((l) => l.chave === 'exe' || l.chave === 'pau').sort((a, b) => (a.chave === b.chave ? 0 : a.chave === 'exe' ? -1 : 1));

  return (
    <>
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>{p.trilha}</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Olá, {p.nome.split(' ')[0]}</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>{TEXTO[p.aba]}</p>
        </div>
        <span style={s('height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px; display: inline-flex; align-items: center')}>{p.escopo}</span>
      </div>

      <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px')}>
        <Link href="/area/iniciativas" style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Iniciativas aguardando sua aprovação</span><span style={s('font-size: 26px; font-weight: 700; color: #4B2FD1')}>{p.aprovacoes.length}</span></Link>
        <Link href="/area/projetos" style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Projetos em execução</span><span style={s('font-size: 26px; font-weight: 700')}>{p.emExecucao}</span></Link>
        <Link href="/area/time" style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Pedidos de alocação</span><span style={{ ...s('font-size: 26px; font-weight: 700'), color: p.pedidos.length ? '#4B2FD1' : '#26213A' }}>{p.pedidos.length}</span></Link>
        <Link href="/area/time" style={sKpi}><span style={s('font-size: 12px; color: #5E5770')}>Pessoas acima do cedido</span><span style={{ ...s('font-size: 26px; font-weight: 700'), color: acima > 0 ? '#9A5B05' : '#26213A' }}>{acima}</span></Link>
      </div>

      {toast && <div role="status" style={s('padding: 12px 16px; border-radius: 12px; background: #EFEAFE; color: #3A22A8; font-size: 13px; font-weight: 600')}>{toast}</div>}

      {p.aba === 'iniciativas' && <section id="aprovacoes" aria-label="Aprovações pendentes" style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
        <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Iniciativas aguardando sua aprovação</h2><span style={s('font-size: 12px; color: #5E5770')}>Ao aprovar, a iniciativa segue para avaliação do PMO no fechamento do ciclo.</span></div>
        {p.aprovacoes.map((a) => {
          const ret = devolvendo === a.id;
          const rec = recusando === a.id;
          const aberto = aberta === a.id;
          const alternar = () => setAberta(aberto ? null : a.id);
          return (
            <div key={a.id} onClick={cliqueNaLinha(alternar)} style={{ ...s('border: 1px solid #EFEBE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; cursor: pointer'), background: aberto ? '#FAF8F4' : undefined }}>
              <div style={s('display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start')}>
                <div style={s('display: flex; flex-direction: column; gap: 4px; flex: 1 1 280px; min-width: 0')}>
                  <TituloExpansivel id={a.id} titulo={a.titulo} aberto={aberto} alternar={alternar} tamanho={15} />
                  <span style={s('font-size: 12px; color: #5E5770')}>{a.quem} · enviada {a.quando}</span>
                  {!aberto && <span style={s('font-size: 13px; color: #4A4458; line-height: 1.5')}>{a.problema}</span>}
                </div>
                <div style={s('display: flex; flex-wrap: wrap; gap: 6px')}>
                  <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EFEAFE; color: #4B2FD1')}>{a.tipo}</span>
                  <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px'), background: a.urgente ? '#FEF3DC' : '#EDEAE3', color: a.urgente ? '#7A4A04' : '#4A4458' }}>{a.urg}</span>
                  <span style={s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; background: #EDEAE3; color: #4A4458')}>{a.custo}</span>
                </div>
              </div>
              {aberto && <DetalheIniciativa id={a.id} titulo={a.titulo} det={a.det} />}
              {ret && (
                <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>O que precisa ser ajustado?
                  <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalhe o custo estimado e quem mais é impactado." style={s('padding: 10px 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; font-weight: 400; color: #26213A; resize: vertical')} />
                </label>
              )}
              {rec && (
                <div style={s('display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 10px; background: #FBEAE8')}>
                  <span style={s('font-size: 13px; color: #7A1A12')}>A iniciativa sai da esteira e vai para Cancelados. {a.quem.split(' ')[0]} vê o motivo e o seu comentário.</span>
                  <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Motivo
                    <select value={motivo} onChange={(e) => setMotivo(e.target.value)} style={s('height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; font-weight: 400; color: #26213A; background: #FFFFFF')}>
                      <option value="">Escolha…</option>
                      {p.motivos.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label style={s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600')}>Comentário para quem pediu
                    <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: já está coberto pelo projeto de roteirização." style={s('padding: 10px 12px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; font-weight: 400; color: #26213A; resize: vertical; background: #FFFFFF')} />
                  </label>
                </div>
              )}
              <div style={s('display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px')}>
                {rec ? (
                  <>
                    <button type="button" disabled={pend} onClick={() => setRecusando(null)} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Voltar</button>
                    <button type="button" disabled={pend} onClick={() => rodar(() => naoSeguirComoGestor(a.id, motivo, nota))} style={s('height: 38px; padding: 0 16px; border-radius: 10px; border: 0; background: #B42318; color: #FFFFFF; font-weight: 600; font-size: 13px')}>Confirmar: não seguir</button>
                  </>
                ) : !ret ? (
                  <>
                    <button type="button" disabled={pend} onClick={() => { setRecusando(a.id); setDevolvendo(null); setNota(''); setMotivo(''); }} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #F1C9C4; background: #FFFFFF; color: #B42318; font-size: 13px')}>Não seguir</button>
                    <button type="button" disabled={pend} onClick={() => { setDevolvendo(a.id); setRecusando(null); setNota(''); }} style={s('height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #E2DCD0; background: #FFFFFF; color: #26213A; font-size: 13px')}>Devolver para ajuste</button>
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
      </section>}

      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        {p.aba !== 'time' && <TabelaArea aberta={aberta} setAberta={setAberta} titulo={p.aba === 'iniciativas' ? 'Iniciativas da área no portfólio' : 'Projetos da área'} linhas={p.aba === 'iniciativas' ? iniciativas : projetos}
          vazio={p.aba === 'iniciativas' ? 'Nenhuma iniciativa da área no portfólio ainda.' : 'Nenhum projeto da área rodando agora.'} />}
        {p.aba === 'time' && <section id="capacidade" aria-label="Capacidade do time" style={s('flex: 1 1 420px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px')}>
          <div style={s('display: flex; flex-direction: column; gap: 2px')}><h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>Quanto o time pode ceder</h2><span style={s('font-size: 12px; color: #5E5770')}>Você conhece a operação: defina o máximo de cada pessoa para projetos.</span></div>
          {p.pedidos.map((x) => (
            <div key={x.id} style={s('padding: 12px; border-radius: 12px; background: #FEF3DC; display: flex; flex-direction: column; gap: 8px')}>
              <span style={s('font-size: 13px; font-weight: 600; color: #6B3F03')}>Pedido de alocação</span>
              <span style={s('font-size: 13px; color: #4A3205')}>{x.texto}</span>
              <ImpactoPedido quem={x.quem} imp={x.impacto} />
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
        </section>}
      </div>
    </>
  );
}

/** Como a pessoa fica mês a mês se o gestor ceder: carga total, parte do projeto e o que sobra para a área. */
function ImpactoPedido({ quem, imp }: { quem: string; imp: Pedido['impacto'] }) {
  const acima = imp.meses.filter((m) => m.situacao === 'acima');
  const soCom = imp.meses.filter((m) => m.situacao === 'so_com_pedido');
  const resumo = acima.length
    ? `Mesmo cedendo, ${quem} fica acima do novo limite em ${acima.map((m) => m.mes).join(', ')} (pico de ${Math.max(...acima.map((m) => m.carga))}%). Vale conversar com o GP.`
    : soCom.length
      ? `Sem ceder, ${quem} fica acima do limite em ${soCom.map((m) => m.mes).join(', ')}. Cedendo, cabe em todos os meses.`
      : `${quem} cabe no limite atual em todos os meses.`;
  const cor = { ok: '#6D4AFF', so_com_pedido: '#C27A0A', acima: '#B42318' };
  return (
    <section aria-label={`Impacto de ceder ${quem}`} style={s('background: #FFFFFF; border: 1px solid #E8CF9C; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px')}>
      <span style={s('font-size: 12px; font-weight: 600; color: #4A3205')}>Se ceder: limite de {quem} vai de {imp.limiteAtual}% para {imp.limiteNovo}%</span>
      <div style={s('display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px')}>
        {imp.meses.map((m) => (
          <div key={m.mes} title={`${m.mes}: ${m.carga}% em projetos (${m.doProjeto}% deste projeto) · fica na área ${Math.max(0, 100 - m.carga)}%`} style={s('display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #5E5770; min-width: 0')}>
            <span style={s('font-weight: 600; color: #26213A')}>{m.mes}</span>
            <div style={s('height: 36px; border-radius: 4px; background: #EFEBE3; position: relative; overflow: hidden')}>
              <div style={{ ...s('position: absolute; left: 0; right: 0; border-top: 1px dashed #8A8296'), bottom: `${imp.limiteNovo}%` }} />
              <div style={{ ...s('position: absolute; left: 0; right: 0; bottom: 0'), height: `${Math.min(100, m.carga)}%`, background: cor[m.situacao], opacity: 0.85 }} />
            </div>
            <span style={{ fontWeight: 700, color: m.situacao === 'ok' ? '#26213A' : cor[m.situacao] }}>{m.carga}%</span>
            <span>área {Math.max(0, 100 - m.carga)}%</span>
          </div>
        ))}
      </div>
      <span style={s('font-size: 12px; color: #4A3205')}>{resumo}{imp.comCronograma ? '' : ' O projeto ainda não tem cronograma com essa pessoa, então os meses mostram só a carga atual.'}</span>
    </section>
  );
}

function TabelaArea({ titulo, linhas, vazio, aberta, setAberta }: { titulo: string; linhas: Linha[]; vazio: string; aberta: string | null; setAberta: (id: string | null) => void }) {
  return (
    <section aria-label={titulo} style={s('flex: 999 1 520px; min-width: 0; background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px')}>
      <h2 style={s('margin: 0; font-size: 18px; font-weight: 700')}>{titulo}</h2>
      <div style={s('overflow-x: auto')}>
        <div style={s('min-width: 560px; display: flex; flex-direction: column')}>
          <div style={s('display: grid; grid-template-columns: 2.2fr 1.1fr 1.6fr 0.8fr; gap: 10px; padding: 8px 4px; font-size: 12px; color: #5E5770; font-weight: 600; border-bottom: 1px solid #EFEBE3')}><span>Nome · clique para ver os detalhes</span><span>Etapa</span><span>Situação / GP</span><span>Farol</span></div>
          {linhas.map((r) => {
            const f = r.farol ? FAROL[r.farol as Farol] : null;
            const aberto = aberta === r.id;
            const alternar = () => setAberta(aberto ? null : r.id);
            return (
              <div key={r.id} onClick={cliqueNaLinha(alternar)} style={{ ...s('display: flex; flex-direction: column; gap: 10px; padding: 12px 4px; border-bottom: 1px solid #F3F0EA; cursor: pointer'), background: aberto ? '#FAF8F4' : undefined }}>
                <div style={s('display: grid; grid-template-columns: 2.2fr 1.1fr 1.6fr 0.8fr; gap: 10px; font-size: 13px; align-items: center')}>
                  <span style={s('display: flex; flex-direction: column')}><TituloExpansivel id={r.id} titulo={r.nome} aberto={aberto} alternar={alternar} tamanho={13} /><span style={s('font-size: 11px; color: #5E5770; padding-left: 16px')}>{r.tipo}</span></span>
                  <span>{r.etapa}</span>
                  <span style={s('color: #4A4458')}>{r.info}</span>
                  {f ? <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; justify-self: start'), background: f.bg, color: f.fg }}>{f.rotulo}</span> : <span style={s('font-size: 12px; color: #8A8296')}>—</span>}
                </div>
                {aberto && <DetalheIniciativa id={r.id} titulo={r.nome} det={r.det} />}
              </div>
            );
          })}
          {linhas.length === 0 && <span style={s('font-size: 13px; color: #5E5770; padding: 12px 4px')}>{vazio}</span>}
        </div>
      </div>
    </section>
  );
}
