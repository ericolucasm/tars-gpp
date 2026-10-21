'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { s } from '@/lib/css';
import { enviarLembrete, mudarEtapa, novoCiclo, salvarCiclo, type CamposCiclo } from '@/app/acoes/ciclos';
import { estiloPill } from '@/components/ui';

export type CicloDet = {
  id: string; nome: string; descricao: string; etapa: string; etapaIdx: number; statusRotulo: string; janela: string; resumo: string;
  etapas: { nome: string; data: string }[]; numeros: (string | number | undefined)[][]; semEnvio: string; motivos: string; comunicadoEm: string;
  campos: CamposCiclo;
};

const sNum = s('background: #F7F5F0; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px');
const sLab = s('display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 600');
const sIn = s('height: 42px; padding: 0 10px; border-radius: 10px; border: 1px solid #E2DCD0; font-size: 14px; color: #26213A');
const sBtn = s('height: 40px; padding: 0 16px; border-radius: 10px; border: 0; background: #6D4AFF; color: #FFFFFF; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center');

export function TelaCiclos({ ciclos, empresa, modo, areas }: { ciclos: CicloDet[]; empresa: string; modo: string; areas: { id: string; nome: string }[] }) {
  const inicial = ciclos.find((c) => c.etapa !== 'encerrado' && c.etapa !== 'planejado') ?? ciclos[0];
  const [sel, setSel] = useState(inicial?.id ?? '');
  const c = ciclos.find((x) => x.id === sel) ?? ciclos[0];
  const [campos, setCampos] = useState<CamposCiclo | null>(c?.campos ?? null);
  const [toast, setToast] = useState('');
  const [pend, start] = useTransition();
  useEffect(() => { setCampos(c?.campos ?? null); }, [c?.id, c?.campos]);

  const rodar = (fn: () => Promise<{ ok: boolean; msg?: string; erro?: string }>) => start(async () => { const r = await fn(); setToast(r.ok ? r.msg ?? '' : r.erro ?? ''); });
  const set = <K extends keyof CamposCiclo>(k: K, v: CamposCiclo[K]) => setCampos((x) => (x ? { ...x, [k]: v } : x));
  const ativo = c && c.etapa !== 'encerrado';

  return (
    <>
      <div style={s('display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end')}>
        <div style={s('display: flex; flex-direction: column; gap: 4px')}>
          <span style={s('font-size: 12px; color: #5E5770')}>Gestão / Ciclos de planejamento</span>
          <h1 style={s('margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.3px')}>Ciclos de planejamento</h1>
          <p style={s('margin: 0; font-size: 14px; color: #5E5770')}>Defina quando as áreas podem enviar iniciativas e acompanhe cada janela até as decisões.</p>
        </div>
        <button type="button" disabled={pend} onClick={() => rodar(novoCiclo)} style={sBtn}>Novo ciclo</button>
      </div>

      {toast && <div role="status" style={s('padding: 12px 16px; border-radius: 12px; background: #EFEAFE; color: #3A22A8; font-size: 13px; font-weight: 600')}>{toast}</div>}

      <div style={s('display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start')}>
        <div style={s('flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 10px')}>
          {ciclos.map((x) => {
            const on = x.id === c?.id;
            const vivo = x.etapa !== 'encerrado';
            return (
              <button key={x.id} type="button" aria-pressed={on} onClick={() => { setSel(x.id); setToast(''); }}
                style={{ ...s('display: flex; flex-direction: column; gap: 6px; text-align: left; padding: 14px; border-radius: 14px; background: #FFFFFF; color: #26213A'), border: on ? '2px solid #6D4AFF' : '1px solid #E2DCD0' }}>
                <span style={s('display: flex; justify-content: space-between; align-items: center; gap: 8px')}>
                  <span style={s('font-size: 15px; font-weight: 700')}>{x.nome}</span>
                  <span style={{ ...s('font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 10px; white-space: nowrap'), background: vivo ? '#E7E0FF' : '#EDEAE3', color: vivo ? '#4B2FD1' : '#4A4458' }}>{x.statusRotulo}</span>
                </span>
                <span style={s('font-size: 12px; color: #5E5770')}>{x.janela}</span>
                <span style={s('font-size: 12px; color: #4A4458')}>{x.resumo}</span>
              </button>
            );
          })}
          <div style={s('padding: 14px; border-radius: 12px; background: #F3F0EA; font-size: 12px; color: #4A4458; line-height: 1.55')}>
            Modo de captação da {empresa}: <strong>{modo}</strong>. {modo === 'misto' ? 'Iniciativas urgentes ou obrigatórias entram a qualquer momento, fora do ciclo.' : ''}
          </div>
        </div>

        {c && (
          <div style={s('flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 16px')}>
            <section style={s('background: #FFFFFF; border: 1px solid #E2DCD0; border-radius: 16px; padding: 22px; display: flex; flex-direction: column; gap: 18px')}>
              <div style={s('display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start')}>
                <div style={s('display: flex; flex-direction: column; gap: 4px')}>
                  <h2 style={s('margin: 0; font-size: 20px; font-weight: 700')}>{c.nome}</h2>
                  <span style={s('font-size: 13px; color: #5E5770')}>{ativo ? c.descricao : `Ciclo encerrado${c.comunicadoEm ? ` · decisões comunicadas em ${c.comunicadoEm}` : ''}`}</span>
                </div>
                <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
                  {c.etapa === 'planejado' && <button type="button" disabled={pend} onClick={() => rodar(() => mudarEtapa(c.id, 'inscricoes'))} style={sBtn}>Abrir inscrições</button>}
                  {c.etapa === 'inscricoes' && <button type="button" disabled={pend} onClick={() => rodar(() => mudarEtapa(c.id, 'avaliacao'))} style={sBtn}>Encerrar inscrições</button>}
                  {c.etapa === 'avaliacao' && <Link href="/avaliacao" style={sBtn}>Ir para avaliação</Link>}
                  {c.etapa === 'comunicado' && <button type="button" disabled={pend} onClick={() => rodar(() => mudarEtapa(c.id, 'encerrado'))} style={sBtn}>Encerrar ciclo</button>}
                </div>
              </div>

              {ativo && (
                <div style={s('display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px')}>
                  {c.etapas.map((e, i) => {
                    const feito = i < c.etapaIdx, agora = i === c.etapaIdx;
                    return (
                      <div key={e.nome} style={s('display: flex; flex-direction: column; gap: 6px')}>
                        <div style={{ height: 6, borderRadius: 3, background: feito ? '#9C8CF0' : agora ? '#6D4AFF' : '#EFEBE3' }} />
                        <span style={{ fontSize: 12, fontWeight: agora ? 700 : 600, color: agora ? '#3A22A8' : '#4A4458' }}>{e.nome}</span>
                        <span style={s('font-size: 11px; color: #5E5770')}>{e.data}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px')}>
                {c.numeros.map(([r, v]) => <div key={String(r)} style={sNum}><span style={s('font-size: 12px; color: #5E5770')}>{r}</span><span style={s('font-size: 22px; font-weight: 700')}>{v}</span></div>)}
              </div>

              {c.etapa === 'inscricoes' && c.semEnvio && (
                <div style={s('padding: 12px 14px; border-radius: 12px; background: #FEF3DC; color: #6B3F03; font-size: 13px')}>
                  {c.semEnvio} ainda não enviaram nenhuma iniciativa.{' '}
                  <button type="button" disabled={pend} onClick={() => rodar(() => enviarLembrete(c.id))} style={s('border: 0; background: transparent; color: #6B3F03; font-weight: 700; text-decoration: underline; font-size: 13px; padding: 0')}>Enviar lembrete</button>
                </div>
              )}

              {!ativo && c.motivos && (
                <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                  <span style={s('font-size: 13px; font-weight: 700')}>Principais motivos de recusa</span>
                  <span style={s('font-size: 13px; color: #4A4458')}>{c.motivos}</span>
                </div>
              )}

              {ativo && campos && (
                <div style={s('border-top: 1px solid #EFEBE3; padding-top: 16px; display: flex; flex-direction: column; gap: 14px')}>
                  <h3 style={s('margin: 0; font-size: 15px; font-weight: 700')}>Configuração da janela</h3>
                  <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px')}>
                    <label style={sLab}>Abertura das inscrições<input type="date" value={campos.abertura} onChange={(e) => set('abertura', e.target.value)} style={sIn} /></label>
                    <label style={sLab}>Fechamento<input type="date" value={campos.fechamento} onChange={(e) => set('fechamento', e.target.value)} style={sIn} /></label>
                    <label style={sLab}>Avaliação do PMO até<input type="date" value={campos.avaliacaoAte} onChange={(e) => set('avaliacaoAte', e.target.value)} style={sIn} /></label>
                    <label style={sLab}>Comunicar decisões até<input type="date" value={campos.comunicarAte} onChange={(e) => set('comunicarAte', e.target.value)} style={sIn} /></label>
                  </div>
                  <div style={s('display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px')}>
                    <label style={sLab}>Orçamento de referência do ciclo
                      <input type="text" inputMode="numeric" value={'R$ ' + campos.orcamentoRef.toLocaleString('pt-BR')} onChange={(e) => set('orcamentoRef', Number(e.target.value.replace(/\D/g, '')) || 0)} style={{ ...sIn, padding: '0 12px' }} />
                      <span style={s('font-size: 12px; font-weight: 400; color: #5E5770')}>Usado na avaliação para comparar o custo das pré-aprovadas.</span>
                    </label>
                    <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                      <span style={s('font-size: 13px; font-weight: 600')}>Quem pode enviar</span>
                      <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
                        {[['todas', 'Todas as áreas'], ['selecionadas', 'Áreas selecionadas']].map(([k, r]) => <button key={k} type="button" aria-pressed={campos.publico === k} onClick={() => set('publico', k)} style={estiloPill(campos.publico === k)}>{r}</button>)}
                      </div>
                    </div>
                  </div>
                  {campos.publico === 'selecionadas' && (
                    <div style={s('display: flex; flex-wrap: wrap; gap: 8px')}>
                      {areas.map((a) => {
                        const on = campos.areasPublico.includes(a.id);
                        return <button key={a.id} type="button" aria-pressed={on} onClick={() => set('areasPublico', on ? campos.areasPublico.filter((x) => x !== a.id) : [...campos.areasPublico, a.id])} style={estiloPill(on)}>{a.nome}</button>;
                      })}
                    </div>
                  )}
                  <div style={s('display: flex; flex-direction: column; gap: 8px')}>
                    <span style={s('font-size: 13px; font-weight: 600')}>Avisos automáticos</span>
                    {([['avisoAbertura', 'Avisar todas as áreas na abertura'], ['avisoLembrete', 'Lembrar áreas sem envio 7 dias antes do fechamento'], ['avisoCobranca', 'Cobrar gestores com aprovações paradas há mais de 3 dias']] as const).map(([k, r]) => (
                      <label key={k} style={s('display: flex; align-items: center; gap: 10px; font-size: 13px')}><input type="checkbox" checked={campos[k]} onChange={(e) => set(k, e.target.checked)} style={s('width: 18px; height: 18px; accent-color: #6D4AFF')} />{r}</label>
                    ))}
                  </div>
                  <div style={s('display: flex; justify-content: flex-end')}>
                    <button type="button" disabled={pend} onClick={() => rodar(() => salvarCiclo(c.id, campos))} style={sBtn}>Salvar configuração</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
